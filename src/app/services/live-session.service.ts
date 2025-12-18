import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
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

const SESSION_EXPIRATION_DAYS = 7; // How old a session must be to get deleted
const MAX_SESSION_DOCUMENTS = 2000; // Max desired sessions
const CLEANUP_THRESHOLD = 0.75; // Only clean if we are at 75% capacity

@Injectable({ providedIn: 'root' })
export class LiveSessionService {
  private firestore = inject(Firestore);
  readonly myUserId = this.getOrInitUserId();

  private getOrInitUserId(): string {
    let storedId = localStorage.getItem('tibia-user-id');
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem('tibia-user-id', storedId);
    }
    return storedId;
  }

  // Create a new Session (You become Leader)
  async createSession(): Promise<string> {
    this.cleanupOldSessions().catch((err) => console.warn('Cleanup warning', err));
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

  private async cleanupOldSessions() {
    try {
      const sessionsColl = collection(this.firestore, 'sessions');

      const countSnapshot = await getCountFromServer(sessionsColl);
      const currentCount = countSnapshot.data().count;
      const limit = MAX_SESSION_DOCUMENTS * CLEANUP_THRESHOLD;

      if (currentCount < limit) {
        console.log(`Skipping cleanup. Count: ${currentCount}/${MAX_SESSION_DOCUMENTS}`);
        return;
      }

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - SESSION_EXPIRATION_DAYS);
      const cutoffTimestamp = Timestamp.fromDate(expirationDate);

      const oldSessionsQuery = query(sessionsColl, where('createdAt', '<', cutoffTimestamp));

      const snapshot = await getDocs(oldSessionsQuery);

      if (!snapshot.empty) {
        const batch = writeBatch(this.firestore);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Cleaned up ${snapshot.size} expired sessions.`);
      }
    } catch (err) {
      console.warn('Cleanup failed (check permissions or indexes):', err);
    }
  }

  // Listen to Session Changes
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

  // Update My Data (Member or Leader)
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

  // Update Party Log (Leader Only)
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
