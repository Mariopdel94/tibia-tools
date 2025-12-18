import { Injectable } from '@angular/core';
import { CREATURE_PRODUCTS } from '../../creature-products.data';
import {
  FinancialResult,
  GroupedItemTransfer,
  LootResult,
  PlayerInput,
  TransferInstruction,
} from '../models/creature-product-splitter';

const REGEX_HEADER = /^(Session|Loot|Supplies|Balance|Damage|Healing)/;
const REGEX_LEADER_SUFFIX = /\s\(Leader\)$/i;
const REGEX_LOOT_LINE = /^(\d+)x\s+(.+)$/;
const REGEX_ARTICLE_PREFIX = /^(a|an)\s+/i;
const REGEX_DIGIT_START = /^\d/;

@Injectable({ providedIn: 'root' })
export class LootCalculatorService {
  readonly productMap: Map<string, { realName: string; price: number }>;

  constructor() {
    this.productMap = new Map();
    Object.entries(CREATURE_PRODUCTS).forEach(([key, price]) => {
      this.productMap.set(key.toLowerCase().trim(), { realName: key, price });
    });
  }

  // --- Parsers ---
  /**
   * Parses the raw text from the Party Hunt Analyzer.
   * Extracts balance and preserves the original casing of the player name.
   */
  parsePartyLog(log: string): Record<string, { balance: number; originalName: string }> {
    const result: Record<string, { balance: number; originalName: string }> = {};
    const lines = log.split('\n');
    let currentPlayer = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Identify Player Name Line (Not a header, doesn't start with number)
      if (!REGEX_HEADER.test(trimmed) && !REGEX_DIGIT_START.test(trimmed)) {
        currentPlayer = trimmed.replace(REGEX_LEADER_SUFFIX, '').trim();
        continue;
      }

      // Identify Balance Line
      if (currentPlayer && trimmed.startsWith('Balance:')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          const balance = parseInt(parts[1].replace(/,/g, ''), 10) || 0;
          result[currentPlayer.toLowerCase()] = { balance, originalName: currentPlayer };
        }
      }
    }
    return result;
  }

  /**
   * Parses a single session log to find Creature Products.
   * @returns A map of ItemName -> Quantity
   */
  parseSessionLog(log: string): Record<string, number> {
    const loot: Record<string, number> = {};
    const lines = log.split('\n');
    let isLootSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('Looted Items:')) {
        isLootSection = true;
        continue;
      }

      if (isLootSection) {
        // Exit section if line is empty or doesn't match "1x Item" pattern
        if (trimmed === '' || !REGEX_DIGIT_START.test(trimmed)) {
          if (trimmed !== '') break;
          continue;
        }

        const match = trimmed.match(REGEX_LOOT_LINE);
        if (match) {
          const amount = parseInt(match[1], 10);
          const rawName = match[2];

          // Normalize: remove "a/an", trim, lowercase
          const cleanName = rawName.trim().replace(REGEX_ARTICLE_PREFIX, '').trim().toLowerCase();

          if (this.productMap.has(cleanName)) {
            const { realName } = this.productMap.get(cleanName)!;
            loot[realName] = (loot[realName] || 0) + amount;
          }
        }
      }
    }
    return loot;
  }

  // --- Calculations ---

  public calculate(partyLog: string, players: PlayerInput[]): LootResult {
    const sessionLogs: Record<string, string> = {};
    const validPlayers = players.filter((p) => p.name.trim() && p.log.trim());
    validPlayers.forEach((p) => (sessionLogs[p.name.trim().toLowerCase()] = p.log));

    const partyData = this.parsePartyLog(partyLog);
    return this.calculateDistribution(sessionLogs, partyData, players);
  }

  /**
   * Core logic to determine who owes what (items and gold).
   */
  calculateDistribution(
    sessionLogs: Record<string, string>,
    partyData: Record<string, { balance: number; originalName: string }>,
    allPlayers: PlayerInput[]
  ): LootResult {
    // 1. Unify Player IDs
    const uniqueIds = new Set([...Object.keys(partyData), ...Object.keys(sessionLogs)]);
    const playerIds = Array.from(uniqueIds);

    // Helper to resolve display names (Party Log Name > Input Name > ID)
    const getDisplayName = (id: string) => {
      if (partyData[id]) return partyData[id].originalName;
      const inputPlayer = allPlayers.find((p) => p.name.trim().toLowerCase() === id);
      return inputPlayer ? inputPlayer.name : id;
    };

    // 2. Aggregate Data
    const globalLoot: Record<string, number> = {};
    const playerInventories: Record<string, Record<string, number>> = {};
    const playerProductValue: Record<string, number> = {};
    let totalCreatureValue = 0;

    playerIds.forEach((pId) => {
      const inv = sessionLogs[pId] ? this.parseSessionLog(sessionLogs[pId]) : {};
      playerInventories[pId] = inv;
      let myHeldValue = 0;

      Object.entries(inv).forEach(([item, qty]) => {
        globalLoot[item] = (globalLoot[item] || 0) + qty;
        const price = this.productMap.get(item.toLowerCase())?.price || 0;
        myHeldValue += qty * price;
      });

      playerProductValue[pId] = myHeldValue;
      totalCreatureValue += myHeldValue;
    });

    // 3. Calculate Item Splits
    const { itemInstructions, remainder } = this.resolveItemSplits(
      playerIds,
      globalLoot,
      playerInventories,
      getDisplayName
    );

    // 4. Group Item Instructions by Player Pair (A -> B : [Items])
    const groupedItemInstructions = this.groupItemTransfers(itemInstructions);

    // 5. Calculate Financials (Gold Splits)
    const { financials, goldInstructions, partyBalance } = this.resolveFinancials(
      playerIds,
      partyData,
      playerProductValue,
      getDisplayName
    );

    // Convert globalLoot Record to Array
    const totalLootArray = Object.entries(globalLoot)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount); // Optional: Sort by quantity

    // Convert remainder Record to Array
    const remainderArray = Object.entries(remainder).map(([name, amount]) => ({ name, amount }));

    return {
      totalLoot: totalLootArray,
      totalValue: totalCreatureValue,
      remainder: remainderArray,
      groupedItemInstructions,
      goldInstructions,
      financials,
      partyBalance,
    };
  }

  /**
   * Generates instructions for distributing physical items evenly.
   */
  resolveItemSplits(
    playerIds: string[],
    globalLoot: Record<string, number>,
    playerInventories: Record<string, Record<string, number>>,
    nameResolver: (id: string) => string
  ) {
    const itemInstructions: TransferInstruction[] = [];
    const remainder: Record<string, number> = {};

    for (const [item, totalQty] of Object.entries(globalLoot)) {
      const count = playerIds.length;
      const target = Math.floor(totalQty / count);
      const leftOver = totalQty % count;

      if (leftOver > 0) remainder[item] = leftOver;
      if (target === 0) continue;

      // Calculate surplus/deficit for this specific item
      const balances = playerIds.map((pId) => ({
        id: pId,
        val: (playerInventories[pId][item] || 0) - target,
      }));

      // Solve transfers using generic solver
      const transfers = this.solveTransfers(balances);

      transfers.forEach((t) => {
        itemInstructions.push({
          from: nameResolver(t.from),
          to: nameResolver(t.to),
          item,
          amount: t.amount,
        });
      });
    }

    return { itemInstructions, remainder };
  }

  /**
   * Generates instructions for distributing Gold based on liquid balance.
   */
  resolveFinancials(
    playerIds: string[],
    partyData: Record<string, { balance: number }>,
    playerProductValue: Record<string, number>,
    nameResolver: (id: string) => string
  ) {
    const financials: FinancialResult[] = [];
    let totalLiquid = 0;

    // Calculate Liquid Balance per player
    const balances = playerIds.map((pId) => {
      const original = partyData[pId]?.balance || 0;
      const deducted = playerProductValue[pId] || 0;
      const final = original - deducted;
      totalLiquid += final;

      financials.push({
        name: nameResolver(pId),
        originalBalance: original,
        productValueDeducted: deducted,
        finalLiquidBalance: final,
      });

      return { id: pId, val: final };
    });

    const target = Math.floor(totalLiquid / playerIds.length);

    // Adjust balances relative to target (Center around 0)
    const relativeBalances = balances.map((b) => ({ ...b, val: b.val - target }));

    // Solve transfers
    const rawTransfers = this.solveTransfers(relativeBalances, 1); // 1gp tolerance

    const goldInstructions = rawTransfers.map((t) => ({
      from: nameResolver(t.from),
      to: nameResolver(t.to),
      amount: t.amount,
    }));

    return { financials, goldInstructions, partyBalance: totalLiquid };
  }

  /**
   * Generic solver to balance surpluses and deficits.
   * @param balances Array of objects containing ID and the Value (Positive = Surplus, Negative = Deficit).
   * @param tolerance Ignore remainders smaller than this (e.g. 1gp).
   */
  solveTransfers(
    balances: { id: string; val: number }[],
    tolerance = 0
  ): { from: string; to: string; amount: number }[] {
    const rich = balances.filter((b) => b.val > tolerance).sort((a, b) => b.val - a.val); // Descending
    const poor = balances.filter((b) => b.val < -tolerance).sort((a, b) => a.val - b.val); // Ascending (Largest deficit first)

    const instructions: { from: string; to: string; amount: number }[] = [];
    let rIdx = 0;
    let pIdx = 0;

    while (rIdx < rich.length && pIdx < poor.length) {
      const giver = rich[rIdx];
      const receiver = poor[pIdx];

      const deficit = Math.abs(receiver.val);
      const amount = Math.min(giver.val, deficit);

      instructions.push({ from: giver.id, to: receiver.id, amount });

      giver.val -= amount;
      receiver.val += amount; // Reduces deficit toward 0

      if (giver.val <= tolerance) rIdx++;
      if (Math.abs(receiver.val) <= tolerance) pIdx++;
    }

    return instructions;
  }

  /** Groups flat item transfer instructions into batches per player-pair. */
  groupItemTransfers(instructions: TransferInstruction[]): GroupedItemTransfer[] {
    const map = new Map<string, GroupedItemTransfer>();

    for (const ins of instructions) {
      const key = `${ins.from}|${ins.to}`;
      if (!map.has(key)) {
        map.set(key, { from: ins.from, to: ins.to, items: [] });
      }
      map.get(key)!.items.push({ name: ins.item!, amount: ins.amount });
    }

    return Array.from(map.values());
  }
}
