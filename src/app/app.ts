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

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const hash = params['s'];
      if (hash) {
        this.loadSharedState(hash);
      }
    });
  }

  generateShareLink() {
    // 1. Compress Data
    const hash = this.shareService.encodeState(this.partyLogInput(), this.players());

    // 2. Build Full URL
    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = `${baseUrl}?s=${hash}`;

    // 3. Copy to Clipboard
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.snackBar.open('Shareable link copied to clipboard!', 'Nice', { duration: 3000 });

      // Optional: Update browser URL without reloading so the user sees the hash
      this.router.navigate([], { queryParams: { s: hash }, replaceUrl: true });
    });
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
