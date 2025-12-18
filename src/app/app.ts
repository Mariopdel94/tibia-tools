import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

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
import { Header } from './components/header/header';
import { InstructionCard } from './components/instruction-card/instruction-card';
import { LootForm } from './components/loot-form/loot-form';
import { LootReport } from './components/loot-report/loot-report';
import { LootResult, PlayerInput } from './models/creature-product-splitter';
import { LootCalculatorService } from './services/loot-calculator.service';

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
export class App {
  private calculator = inject(LootCalculatorService);
  readonly results = signal<LootResult | null>(null);

  onCalculate(data: { partyLog: string; players: PlayerInput[] }) {
    const result = this.calculator.calculate(data.partyLog, data.players);
    this.results.set(result);
  }
}
