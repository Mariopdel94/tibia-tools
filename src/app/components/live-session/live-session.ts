import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { PlayerInput } from '../../models/creature-product-splitter';
import { LiveSession, LiveSessionService } from '../../services/live-session.service';
import { LootCalculatorService } from '../../services/loot-calculator.service';
import { Header } from '../header/header';
import { LiveSessionInstructions } from '../live-session-instructions/live-session-instructions';
import { LootReport } from '../loot-report/loot-report';
import { SessionMembers } from '../session-members/session-members';

@Component({
  selector: 'app-live-session',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    Header,
    LootReport,
    SessionMembers,
    LiveSessionInstructions,
  ],
  templateUrl: './live-session.html',
  styleUrl: './live-session.scss',
})
export class LiveSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private liveService = inject(LiveSessionService);
  private calculator = inject(LootCalculatorService);
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  sessionId = signal<string>('');
  sessionData = signal<LiveSession | null>(null);
  results = computed(() => this.sessionData()?.results ?? null);

  // My Local Input State
  myName = signal('');
  myLog = signal('');

  private updateTrigger$ = new Subject<void>();

  isLeader = computed(() => {
    const data = this.sessionData();
    if (!data || !data.members) return false;
    const me = data.members[this.liveService.myUserId];
    return me?.isLeader || false;
  });

  memberList = computed(() => {
    const data = this.sessionData();
    if (!data || !data.members) return [];
    return Object.values(data.members);
  });

  constructor() {
    this.updateTrigger$.pipe(takeUntilDestroyed(), debounceTime(1500)).subscribe(() => {
      this.liveService.updateMyEntry(this.sessionId(), this.myName(), this.myLog());
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }
    this.sessionId.set(id);

    // Subscribe to Realtime Updates
    this.liveService
      .getSession(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data) {
          this.sessionData.set(data);

          // If I exist in DB, sync my local form to DB (in case of refresh)
          const me = data.members[this.liveService.myUserId];
          if (me && this.myName() === '') {
            this.myName.set(me.name);
            this.myLog.set(me.log);
          }
        }
      });
  }

  // --- Actions ---

  triggerUpdate() {
    this.updateTrigger$.next();
  }

  // When user types, save to DB (Debounce this in prod, but direct is ok for now)
  updateMyData() {
    this.liveService.updateMyEntry(this.sessionId(), this.myName(), this.myLog());
  }

  updatePartyLog(log: string) {
    if (this.isLeader()) {
      this.liveService.updatePartyLog(this.sessionId(), log);
    }
  }

  copyLink() {
    this.clipboard.copy(window.location.href);
    this.snackBar.open('Session Link copied! Send it to your party.', 'OK', { duration: 3000 });
  }

  calculate() {
    const data = this.sessionData();
    if (!data) return;

    // Convert Members Map to PlayerInput Array
    const players: PlayerInput[] = Object.values(data.members).map((m, i) => ({
      id: i, // ID doesn't matter for calc
      name: m.name,
      log: m.log,
    }));

    const result = this.calculator.calculate(data.partyLog, players);
    this.liveService.saveResults(this.sessionId(), result);
    this.snackBar.open('Results published to all members!', 'OK', { duration: 3000 });
  }

  scrollToResults() {
    document.querySelector('.results-wrapper')?.scrollIntoView({ behavior: 'smooth' });
  }
}
