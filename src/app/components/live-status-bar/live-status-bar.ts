import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { SessionMember } from '../../services/live-session.service';

@Component({
  selector: 'app-live-status-bar',
  imports: [MatIcon],
  templateUrl: './live-status-bar.html',
  styleUrl: './live-status-bar.scss',
})
export class LiveStatusBar {
  isActive = input.required<boolean>();
  isClosed = input.required<boolean>();
  membersList = input.required<SessionMember[]>();
}
