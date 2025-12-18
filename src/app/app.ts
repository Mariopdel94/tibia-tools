import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from './components/header/header';
import { InstructionCard } from './components/instruction-card/instruction-card';
import { LootForm } from './components/loot-form/loot-form';
import { LootReport } from './components/loot-report/loot-report';
import { LootResult, PlayerInput } from './models/creature-product-splitter';
import { LootCalculatorService } from './services/loot-calculator.service';
import { ShareStateService } from './services/share-state.service';

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
    Header,
    InstructionCard,
    LootForm,
    LootReport,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private calculator = inject(LootCalculatorService);
  private shareService = inject(ShareStateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

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
    this.route.queryParams.subscribe((params) => {
      const hash = params['s'];
      if (hash) {
        this.loadSharedState(hash);
      }
    });
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

    // Try to shorten it
    this.isGeneratingTinyUrl.set(true);
    const finalUrl = await this.shareService.shortenUrl(longUrl);
    this.isGeneratingTinyUrl.set(false);
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
