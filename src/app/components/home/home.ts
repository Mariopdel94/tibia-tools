import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { LiveSessionService } from '../../services/live-session.service';
import { Header } from '../header/header';
import { LiveSessionInstructions } from '../live-session-instructions/live-session-instructions';
import { LiveStatusBar } from '../live-status-bar/live-status-bar';

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
    MatProgressSpinner,
    LiveSessionInstructions,
    LiveStatusBar,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private liveService = inject(LiveSessionService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isCreatingLiveSession = signal(false);

  async startLiveSession() {
    this.isCreatingLiveSession.set(true);
    const id = await this.liveService.createSession();
    this.router.navigate(['/live', id]);
    this.isCreatingLiveSession.set(false);
  }

  copyShareLink(url: string, hash: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.snackBar.open('Link copied to clipboard!', 'OK', { duration: 3000 });
      // Note: We don't push the tinyURL to the browser history,
      // we keep the long one or just the hash so reload works.
      this.router.navigate([], { queryParams: { s: hash }, replaceUrl: true });
    });
  }
}
