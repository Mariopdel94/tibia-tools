import { Injectable } from '@angular/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { environment } from '../../environments/environment.development';
import { PlayerInput } from '../models/creature-product-splitter';

// Minimal structure to save space: [PartyLog, [PlayerName, PlayerLog][]]
type MinifiedState = [string, [string, string][]];

@Injectable({ providedIn: 'root' })
export class ShareStateService {
  async shortenUrl(longUrl: string): Promise<string> {
    const apiToken = environment.tinyUrlToken;
    const url = 'https://api.tinyurl.com/create';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: longUrl,
          domain: 'tiny.one',
        }),
      });

      // 1. Check specifically for Quota Exceeded (HTTP 429)
      if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }

      // 2. Check for other API errors (like invalid token)
      if (!response.ok) {
        throw new Error('API_ERROR');
      }

      const result = await response.json();
      return result.data.tiny_url;
    } catch (err: any) {
      // Re-throw specific errors so the component can handle them
      if (err.message === 'QUOTA_EXCEEDED' || err.message === 'API_ERROR') {
        throw err;
      }
      // For network errors (offline), just return generic failure
      throw new Error('NETWORK_ERROR');
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
