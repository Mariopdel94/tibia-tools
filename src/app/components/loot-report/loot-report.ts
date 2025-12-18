import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { LootResult, TransferInstruction } from '../../models/creature-product-splitter';

@Component({
  selector: 'app-loot-report',
  imports: [
    MatCardModule,
    MatDivider,
    MatChipsModule,
    MatTableModule,
    CommonModule,
    MatIcon,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './loot-report.html',
  styleUrl: './loot-report.scss',
})
export class LootReport {
  result = input.required<LootResult>();
  isLoadingShortUrlGeneration = input<boolean>(false);
  shareLongUrl = output<void>();
  shareShortUrl = output<void>();
  canShareUrls = input<boolean>(true);
  readonly displayedColumns = ['name', 'original', 'deduction', 'final'];

  /** Copies the transfer instruction to clipboard formatted for Tibia NPC. */
  copyTransfer(ins: TransferInstruction): void {
    const command = `transfer ${ins.amount} to ${ins.to}`;
    navigator.clipboard.writeText(command).then(() => {
      console.info('Copied to clipboard:', command);
    });
  }
}
