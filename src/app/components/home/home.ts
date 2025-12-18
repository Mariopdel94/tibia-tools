import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { LootResult, PlayerInput } from '../../models/creature-product-splitter';
import { LiveSessionService } from '../../services/live-session.service';
import { LootCalculatorService } from '../../services/loot-calculator.service';
import { ShareStateService } from '../../services/share-state.service';
import { Header } from '../header/header';
import { InstructionCard } from '../instruction-card/instruction-card';
import { LootForm } from '../loot-form/loot-form';
import { LootReport } from '../loot-report/loot-report';

@Component({
  selector: 'app-home',
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
    Header,
    InstructionCard,
    LootForm,
    LootReport,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private liveService = inject(LiveSessionService);
  private calculator = inject(LootCalculatorService);
  private shareService = inject(ShareStateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  partyLogInput = signal<string>('');
  players = signal<PlayerInput[]>([
    { id: 1, name: '', log: '' },
    { id: 2, name: '', log: '' },
    { id: 3, name: '', log: '' },
    { id: 4, name: '', log: '' },
  ]);
  readonly results = signal<LootResult | null>(null);
  isGeneratingTinyUrl = signal<boolean>(false);

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const hash = params['s'];
      if (hash) {
        this.loadSharedState(hash);
      }
    });
  }

  async startLiveSession() {
    const id = await this.liveService.createSession();
    this.router.navigate(['/live', id]);
  }

  copyShareLink(url: string, hash: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.snackBar.open('Link copied to clipboard!', 'OK', { duration: 3000 });
      // Note: We don't push the tinyURL to the browser history,
      // we keep the long one or just the hash so reload works.
      this.router.navigate([], { queryParams: { s: hash }, replaceUrl: true });
    });
  }

  generateLongShareLink(copyUrl: boolean = true) {
    const hash = this.shareService.encodeState(this.partyLogInput(), this.players());
    const baseUrl = window.location.origin + window.location.pathname;
    const longUrl = `${baseUrl}?s=${hash}`;

    if (copyUrl) {
      this.copyShareLink(longUrl, hash);
    }

    return { longUrl, hash };
  }

  async generateShortShareLink() {
    const { longUrl, hash } = this.generateLongShareLink(false);
    let finalUrl = longUrl;

    try {
      this.isGeneratingTinyUrl.set(true);
      finalUrl = await this.shareService.shortenUrl(longUrl);
      this.isGeneratingTinyUrl.set(false);
    } catch (error: any) {
      this.isGeneratingTinyUrl.set(false);
      if (error.message === 'QUOTA_EXCEEDED') {
        this.snackBar.open('Monthly TinyURL limit reached. Using long link instead.', 'Got it', {
          duration: 5000,
          panelClass: ['warning-snackbar'],
        });
      } else {
        console.warn('Shortener failed, falling back to long URL.');
      }
    }
    this.copyShareLink(finalUrl, hash);
  }

  loadSharedState(hash: string) {
    const data = this.shareService.decodeState(hash);

    if (data) {
      // 1. Update Signals
      this.partyLogInput.set(data.partyLog);
      this.players.set(data.players);

      // 2. Auto-Calculate results immediately
      this.onCalculate();

      this.snackBar.open('Shared results loaded successfully.', 'Close', { duration: 3000 });
    } else {
      this.snackBar.open('Invalid or corrupted share link.', 'Error', { duration: 3000 });
    }
  }

  onCalculate() {
    const result = this.calculator.calculate(this.partyLogInput(), this.players());
    this.results.set(result);
  }
}
