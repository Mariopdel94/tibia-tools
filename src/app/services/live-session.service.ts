import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, doc, onSnapshot, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { LootResult } from '../models/creature-product-splitter';

export interface SessionMember {
  id: string; // The user's unique ID
  name: string;
  log: string;
  isLeader: boolean;
  lastUpdated: number;
}

export interface LiveSession {
  id: string;
  partyLog: string;
  members: Record<string, SessionMember>; // Map of UserID -> Member Data
  results?: LootResult;
}

@Injectable({ providedIn: 'root' })
export class LiveSessionService {
  private firestore = inject(Firestore);

  // 1. Identity Management (No Login required)
  readonly myUserId: string;

  constructor() {
    // Generate or retrieve a persistent ID for this browser
    let storedId = localStorage.getItem('tibia-user-id');
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem('tibia-user-id', storedId);
    }
    this.myUserId = storedId;
  }

  // 2. Create a new Session (You become Leader)
  async createSession(): Promise<string> {
    const sessionsColl = collection(this.firestore, 'sessions');
    const newDoc = await addDoc(sessionsColl, {
      createdAt: Date.now(),
      partyLog: '',
      members: {
        [this.myUserId]: {
          id: this.myUserId,
          name: '',
          log: '',
          isLeader: true,
          lastUpdated: Date.now(),
        },
      },
    });
    return newDoc.id;
  }

  // 3. Listen to Session Changes
  getSession(sessionId: string): Observable<LiveSession | undefined> {
    const docRef = doc(this.firestore, `sessions/${sessionId}`);

    // Create a custom Observable that listens to the native Firestore updates
    return new Observable((observer) => {
      // onSnapshot is the native Firebase SDK method for realtime listening
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          const data = snapshot.data() as LiveSession;
          if (data) {
            // Manually add the ID since we aren't using the helper anymore
            data.id = snapshot.id;
            observer.next(data);
          } else {
            // Document doesn't exist (or was deleted)
            observer.next(undefined);
          }
        },
        (error) => {
          console.error('Firestore Error:', error);
          observer.error(error);
        }
      );

      // Cleanup when the component is destroyed (unsubscribes from DB)
      return () => unsubscribe();
    });
  }

  // 4. Update My Data (Member or Leader)
  async updateMyEntry(sessionId: string, name: string, log: string) {
    const docRef = doc(this.firestore, `sessions/${sessionId}`);
    // Update specific key in the map to avoid overwriting others
    await updateDoc(docRef, {
      [`members.${this.myUserId}.name`]: name,
      [`members.${this.myUserId}.log`]: log,
      [`members.${this.myUserId}.id`]: this.myUserId, // Ensure ID exists
      [`members.${this.myUserId}.lastUpdated`]: Date.now(),
    });
  }

  // 5. Update Party Log (Leader Only)
  async updatePartyLog(sessionId: string, log: string) {
    const docRef = doc(this.firestore, `sessions/${sessionId}`);
    await updateDoc(docRef, { partyLog: log });
  }

  async saveResults(sessionId: string, results: LootResult) {
    const docRef = doc(this.firestore, `sessions/${sessionId}`);
    // Save the entire result object to DB so everyone receives it
    await updateDoc(docRef, { results });
  }
}
