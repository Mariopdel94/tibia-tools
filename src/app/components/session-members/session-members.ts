import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SessionMember } from '../../services/live-session.service';

@Component({
  selector: 'app-session-members',
  imports: [CommonModule, MatIconModule],
  templateUrl: './session-members.html',
  styleUrl: './session-members.scss',
})
export class SessionMembers {
  members = input.required<SessionMember[]>();
}
