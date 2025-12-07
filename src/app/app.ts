import { Component, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { CREATURE_PRODUCTS } from '../creature-products.data';

interface PlayerInput {
  id: number; // Unique ID for tracking in @for loops
  name: string;
  log: string;
}

interface FinancialResult {
  name: string;
  originalBalance: number;
  productValueDeducted: number;
  finalLiquidBalance: number;
}

interface TransferInstruction {
  from: string;
  to: string;
  amount: number;
  item?: string; // Optional: if present, it's an item transfer. If missing, it's Gold.
}

interface LootResult {
  totalLoot: Record<string, number>;
  totalValue: number;
  remainder: Record<string, number>;
  itemInstructions: TransferInstruction[];
  goldInstructions: TransferInstruction[]; // NEW: Bank transfers
  financials: FinancialResult[];
  partyBalance: number;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatTableModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  partyLogInput = signal<string>('');
  protected readonly title = signal('tibia-creature-product-split');
  // --- State ---
  // We start with two empty slots for convenience
  players = signal<PlayerInput[]>([
    { id: 1, name: '', log: '' },
    { id: 2, name: '', log: '' },
    { id: 3, name: '', log: '' },
    { id: 4, name: '', log: '' },
  ]);

  results = signal<LootResult | null>(null);
  displayedColumns: string[] = ['name', 'original', 'deduction', 'final'];

  // --- Actions ---

  addPlayer() {
    this.players.update((current) => [...current, { id: Date.now(), name: '', log: '' }]);
  }

  removePlayer(id: number) {
    this.players.update((current) => current.filter((p) => p.id !== id));
  }

  // Helper to normalize the product list once for case-insensitive lookup
  // We map "vampire teeth" (lower) -> { realName: "Vampire Teeth", price: 250 }
  private getNormalizedProductMap() {
    const map = new Map<string, { realName: string; price: number }>();
    Object.entries(CREATURE_PRODUCTS).forEach(([key, price]) => {
      map.set(key.toLowerCase().trim(), { realName: key, price });
    });
    return map;
  }

  processLogs() {
    const sessionLogs: Record<string, string> = {};
    const validPlayers = this.players().filter((p) => p.name.trim() && p.log.trim());

    // We allow processing even if only Party Log is present (though deduction won't happen)
    validPlayers.forEach((p) => (sessionLogs[p.name] = p.log));

    const partyData = this.parsePartyAnalyzer(this.partyLogInput());
    const result = this.calculateDistribution(sessionLogs, partyData);
    this.results.set(result);
  }

  private parsePartyAnalyzer(log: string): Record<string, { balance: number }> {
    const result: Record<string, { balance: number }> = {};
    const lines = log.split('\n');
    let currentPlayer = '';

    const isHeaderLine = (l: string) => /^(Session|Loot|Supplies|Balance|Damage|Healing)/.test(l);
    const getNumber = (l: string) => parseInt(l.replace(/,/g, ''), 10) || 0;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (!isHeaderLine(trimmed) && !/^\d/.test(trimmed)) {
        currentPlayer = trimmed.replace(/\s\(Leader\)$/i, '').trim();
        continue;
      }

      if (currentPlayer && trimmed.startsWith('Balance:')) {
        const parts = trimmed.split(':');
        if (parts.length > 1) {
          result[currentPlayer] = { balance: getNumber(parts[1]) };
        }
      }
    }
    return result;
  }

  private calculateDistribution(
    sessionLogs: Record<string, string>,
    partyData: Record<string, { balance: number }>
  ): LootResult {
    const productMap = this.getNormalizedProductMap();
    const playerNames =
      Object.keys(partyData).length > 0 ? Object.keys(partyData) : Object.keys(sessionLogs);

    const playerProductValue: Record<string, number> = {};
    const globalTotal: Record<string, number> = {};
    const playerInventories: Record<string, Record<string, number>> = {};
    let totalCreatureValue = 0;

    // 1. Parse Items & Value
    const parseLog = (log: string) => {
      const loot: Record<string, number> = {};
      const lines = log.split('\n');
      let processing = false;
      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Looted Items:')) {
          processing = true;
          continue;
        }
        if (processing) {
          if (trimmed === '' || !/^\d+x/.test(trimmed)) {
            if (trimmed !== '') break;
            continue;
          }
          const match = trimmed.match(/^(\d+)x\s+(.+)$/);
          if (match) {
            const amount = parseInt(match[1], 10);
            const cleanName = match[2]
              .trim()
              .replace(/^(a|an)\s+/i, '')
              .trim()
              .toLowerCase();
            if (productMap.has(cleanName)) {
              const info = productMap.get(cleanName)!;
              loot[info.realName] = (loot[info.realName] || 0) + amount;
            }
          }
        }
      }
      return loot;
    };

    // Initialize values for all party members (even if they have no session log)
    playerNames.forEach((p) => {
      const log = sessionLogs[p];
      const inv = log ? parseLog(log) : {};
      playerInventories[p] = inv;
      let myHeldValue = 0;

      Object.entries(inv).forEach(([item, qty]) => {
        globalTotal[item] = (globalTotal[item] || 0) + qty;
        const price = productMap.get(item.toLowerCase())?.price || 0;
        myHeldValue += qty * price;
      });

      playerProductValue[p] = myHeldValue;
      totalCreatureValue += myHeldValue;
    });

    // 2. Item Splits (Physical Items)
    const itemInstructions: TransferInstruction[] = [];
    const remainder: Record<string, number> = {};

    for (const [item, totalQty] of Object.entries(globalTotal)) {
      const target = Math.floor(totalQty / playerNames.length);
      const leftOver = totalQty % playerNames.length;
      if (leftOver > 0) remainder[item] = leftOver;
      if (target === 0) continue;

      let givers: any[] = [];
      let receivers: any[] = [];

      playerNames.forEach((p) => {
        const qty = playerInventories[p][item] || 0;
        if (qty > target) givers.push({ player: p, surplus: qty - target });
        else if (qty < target) receivers.push({ player: p, deficit: target - qty });
      });

      let gIdx = 0,
        rIdx = 0;
      while (gIdx < givers.length && rIdx < receivers.length) {
        const amt = Math.min(givers[gIdx].surplus, receivers[rIdx].deficit);
        itemInstructions.push({
          from: givers[gIdx].player,
          to: receivers[rIdx].player,
          item,
          amount: amt,
        });
        givers[gIdx].surplus -= amt;
        receivers[rIdx].deficit -= amt;
        if (givers[gIdx].surplus === 0) gIdx++;
        if (receivers[rIdx].deficit === 0) rIdx++;
      }
    }

    // 3. Financials & Gold Transfers
    const financials: FinancialResult[] = [];
    let totalPartyLiquidBalance = 0;

    playerNames.forEach((p) => {
      const originalBalance = partyData[p] ? partyData[p].balance : 0;
      const deduction = playerProductValue[p] || 0;
      const finalLiquid = originalBalance - deduction;

      totalPartyLiquidBalance += finalLiquid;

      financials.push({
        name: p,
        originalBalance: originalBalance,
        productValueDeducted: deduction,
        finalLiquidBalance: finalLiquid,
      });
    });

    // 4. Calculate Gold Transfers (Bank Settlement)
    const goldInstructions: TransferInstruction[] = [];
    const targetLiquidBalance = Math.floor(totalPartyLiquidBalance / playerNames.length);

    let richPlayers: { name: string; surplus: number }[] = [];
    let poorPlayers: { name: string; deficit: number }[] = [];

    financials.forEach((f) => {
      const diff = f.finalLiquidBalance - targetLiquidBalance;
      if (diff > 1) {
        // Tolerance of 1gp
        richPlayers.push({ name: f.name, surplus: diff });
      } else if (diff < -1) {
        poorPlayers.push({ name: f.name, deficit: Math.abs(diff) });
      }
    });

    // Sort to minimize transaction count (Largest -> Largest)
    richPlayers.sort((a, b) => b.surplus - a.surplus);
    poorPlayers.sort((a, b) => b.deficit - a.deficit);

    let richIdx = 0,
      poorIdx = 0;
    while (richIdx < richPlayers.length && poorIdx < poorPlayers.length) {
      const giver = richPlayers[richIdx];
      const receiver = poorPlayers[poorIdx];

      const transferAmt = Math.min(giver.surplus, receiver.deficit);

      goldInstructions.push({
        from: giver.name,
        to: receiver.name,
        amount: transferAmt,
      });

      giver.surplus -= transferAmt;
      receiver.deficit -= transferAmt;

      if (giver.surplus < 1) richIdx++;
      if (receiver.deficit < 1) poorIdx++;
    }

    return {
      totalLoot: globalTotal,
      totalValue: totalCreatureValue,
      remainder,
      itemInstructions,
      goldInstructions, // Result of step 4
      financials,
      partyBalance: totalPartyLiquidBalance,
    };
  }
}
