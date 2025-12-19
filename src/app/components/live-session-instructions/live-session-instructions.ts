import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-live-session-instructions',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './live-session-instructions.html',
  styleUrl: './live-session-instructions.scss',
})
export class LiveSessionInstructions {
  collapsed = signal(false);

  toggle() {
    this.collapsed.update((v) => !v);
  }
}
