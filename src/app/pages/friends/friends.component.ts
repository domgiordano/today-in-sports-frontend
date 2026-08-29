import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { AuthUiService } from '../../services/auth-ui.service';
import { FriendsService, Player } from '../../services/friends.service';

/**
 * Friends.
 *
 * The page leads with the board rather than the list, because the reason to
 * add somebody is to see whether you beat them today. The list of who you know
 * is management, and management goes underneath.
 */
@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.scss'],
})
export class FriendsComponent implements OnInit {
  handle = '';
  error = '';
  notice = '';
  busy = '';

  constructor(
    readonly friends: FriendsService,
    readonly auth: AuthService,
    private readonly authUi: AuthUiService,
  ) {}

  ngOnInit(): void {
    if (this.auth.signedIn) this.refresh();
  }

  signIn(): void {
    this.authUi.open('signin');
  }

  refresh(): void {
    this.friends.load().subscribe({
      error: () => (this.error = 'Could not load your friends.'),
    });
  }

  get canAdd(): boolean {
    return this.handle.trim().replace(/^@/, '').length >= 3 && !this.busy;
  }

  add(): void {
    if (!this.canAdd) return;
    const who = this.handle.trim().replace(/^@/, '');
    this.run('request', who, () => {
      this.handle = '';
      // The server decides whether this became a request or a friendship,
      // because they may have already asked you.
      this.notice = `Sent to @${who}.`;
    });
  }

  accept(p: Player): void { this.run('accept', p.username ?? '', () => undefined); }

  /** Decline, withdraw and unfriend are the same call — the edge stops existing. */
  remove(p: Player): void { this.run('remove', p.username ?? '', () => undefined); }

  private run(action: 'request' | 'accept' | 'remove', who: string, done: () => void): void {
    if (!who) return;
    this.busy = who;
    this.error = '';
    this.notice = '';
    this.friends.act(action, who).subscribe({
      next: () => { this.busy = ''; done(); this.refresh(); },
      error: (err) => {
        this.busy = '';
        // The server's message is the useful one — "no player with that
        // handle", "you cannot add yourself".
        this.error = err?.error?.error?.message || 'That did not work.';
      },
    });
  }

  trackById(_: number, p: Player): string { return p.userId; }
}
