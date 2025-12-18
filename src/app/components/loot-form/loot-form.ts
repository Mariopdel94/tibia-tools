import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PlayerInput } from '../../models/creature-product-splitter';
import { LootCalculatorService } from '../../services/loot-calculator.service';

@Component({
  selector: 'app-loot-form',
  imports: [
    MatIcon,
    MatFormField,
    MatLabel,
    FormsModule,
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    MatCardSubtitle,
    MatButtonModule,
    MatInputModule,
  ],
  templateUrl: './loot-form.html',
  styleUrl: './loot-form.scss',
})
export class LootForm {
  lootCalculator = inject(LootCalculatorService);
  calculate = output<{ partyLog: string; players: PlayerInput[] }>();

  readonly partyLogInput = signal<string>('');
  readonly players = signal<PlayerInput[]>([
    { id: 1, name: '', log: '' },
    { id: 2, name: '', log: '' },
    { id: 3, name: '', log: '' },
    { id: 4, name: '', log: '' },
  ]);

  addPlayer() {
    this.players.update((current) => [...current, { id: Date.now(), name: '', log: '' }]);
  }

  removePlayer(id: number) {
    this.players.update((current) => current.filter((p) => p.id !== id));
  }

  onSubmit() {
    this.calculate.emit({
      partyLog: this.partyLogInput(),
      players: this.players(),
    });
  }
}
