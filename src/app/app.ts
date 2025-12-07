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
import { CREATURE_PRODUCTS } from '../creature-products.data';

interface PlayerInput {
  id: number; // Unique ID for tracking in @for loops
  name: string;
  log: string;
}

interface LootResult {
  totalLoot: Record<string, number>;
  totalValue: number;
  remainder: Record<string, number>;
  instructions: { from: string; to: string; item: string; amount: number }[];
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
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('tibia-creature-product-split');
  // --- State ---
  // We start with two empty slots for convenience
  players = signal<PlayerInput[]>([
    { id: 1, name: '', log: '' },
    { id: 2, name: '', log: '' },
  ]);

  results = signal<LootResult | null>(null);

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
    // Convert array to Record<Name, Log>
    const sessionLogs: Record<string, string> = {};

    // Filter out empty entries
    const validPlayers = this.players().filter((p) => p.name.trim() && p.log.trim());

    if (validPlayers.length === 0) {
      alert('Please enter at least one player name and log.');
      return;
    }

    validPlayers.forEach((p) => {
      sessionLogs[p.name] = p.log;
    });

    const result = this.calculateDistribution(sessionLogs);
    this.results.set(result);
  }

  // --- Logic (From previous step) ---

  private calculateDistribution(sessionLogs: Record<string, string>): LootResult {
    const productMap = this.getNormalizedProductMap();
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
            const rawName = match[2].trim();
            let cleanName = rawName.replace(/^(a|an)\s+/i, '').trim();
            const lowerName = cleanName.toLowerCase();

            // --- FILTER LOGIC HERE ---
            // Only add if it exists in our JSON list
            if (productMap.has(lowerName)) {
              const productInfo = productMap.get(lowerName)!;
              loot[productInfo.realName] = (loot[productInfo.realName] || 0) + amount;
            }
          }
        }
      }
      return loot;
    };

    const players = Object.keys(sessionLogs);
    const playerInventories: Record<string, Record<string, number>> = {};
    const globalTotal: Record<string, number> = {};
    let totalValue = 0;

    players.forEach((p) => {
      const inv = parseLog(sessionLogs[p]);
      playerInventories[p] = inv;
      Object.entries(inv).forEach(([item, qty]) => {
        globalTotal[item] = (globalTotal[item] || 0) + qty;
        const price = productMap.get(item.toLowerCase())?.price || 0;
        totalValue += qty * price;
      });
    });

    const instructions: any[] = [];
    const remainder: Record<string, number> = {};

    for (const [item, totalQty] of Object.entries(globalTotal)) {
      const target = Math.floor(totalQty / players.length);
      const leftOver = totalQty % players.length;
      if (leftOver > 0) remainder[item] = leftOver;
      if (target === 0) continue;

      let givers: any[] = [];
      let receivers: any[] = [];

      players.forEach((p) => {
        const qty = playerInventories[p][item] || 0;
        if (qty > target) givers.push({ player: p, surplus: qty - target });
        else if (qty < target) receivers.push({ player: p, deficit: target - qty });
      });

      let gIdx = 0,
        rIdx = 0;
      while (gIdx < givers.length && rIdx < receivers.length) {
        const amt = Math.min(givers[gIdx].surplus, receivers[rIdx].deficit);
        instructions.push({
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

    return { totalLoot: globalTotal, totalValue, remainder, instructions };
  }
}
