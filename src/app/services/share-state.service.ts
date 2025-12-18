import { Injectable } from '@angular/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { PlayerInput } from '../models/creature-product-splitter';

// Minimal structure to save space: [PartyLog, [PlayerName, PlayerLog][]]
type MinifiedState = [string, [string, string][]];

@Injectable({ providedIn: 'root' })
export class ShareStateService {
  async shortenUrl(longUrl: string): Promise<string> {
    // Free TinyURL API (No key required for basic usage)
    const api = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
    try {
      const response = await fetch(api);
      if (response.ok) {
        return await response.text(); // Returns the short URL
      }
      return longUrl; // Fallback to long URL if fail
    } catch (err) {
      return longUrl;
    }
  }

  /**
   * Compresses the current state into a URL-safe string.
   */
  encodeState(partyLog: string, players: PlayerInput[]): string {
    // 1. Minify: Strip IDs and keys, keep only essential data
    // Filter out empty players to save space
    const validPlayers = players.filter((p) => p.name.trim() || p.log.trim());

    const minified: MinifiedState = [partyLog, validPlayers.map((p) => [p.name, p.log])];

    // 2. Serialize & Compress
    const jsonString = JSON.stringify(minified);
    return compressToEncodedURIComponent(jsonString);
  }

  /**
   * Decompresses the string back into usable app state.
   */
  decodeState(compressedString: string): { partyLog: string; players: PlayerInput[] } | null {
    try {
      // 1. Decompress
      const jsonString = decompressFromEncodedURIComponent(compressedString);
      if (!jsonString) return null;

      // 2. Parse
      const minified: MinifiedState = JSON.parse(jsonString);

      // 3. Reconstruct State
      // Index 0 is party log, Index 1 is array of players
      const partyLog = minified[0] || '';
      const rawPlayers = minified[1] || [];

      const players: PlayerInput[] = rawPlayers.map((p, index) => ({
        id: Date.now() + index, // Generate new IDs
        name: p[0],
        log: p[1],
      }));

      // Ensure we always have at least 2 empty slots if the loaded list is short
      while (players.length < 2) {
        players.push({ id: Date.now() + players.length, name: '', log: '' });
      }

      return { partyLog, players };
    } catch (e) {
      console.error('Failed to parse share URL', e);
      return null;
    }
  }
}
