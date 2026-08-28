import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { AuthUiService } from '../../services/auth-ui.service';
import { Group, GroupsService } from '../../services/groups.service';
import { LeaderboardResponse, PlayService } from '../../services/play.service';
import { ProfileService } from '../../services/profile.service';

/**
 * Friend groups.
 *
 * You join by being given a code. There is no directory to browse, which is
 * the whole reason a small private group stays private.
 */
@Component({
  selector: 'app-groups',
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss'],
})
export class GroupsComponent implements OnInit {
  loading = true;
  error = '';
  busy = false;

  newName = '';
  joinCode = '';

  /** Today's board for each group, keyed by id. */
  boards: Record<string, LeaderboardResponse> = {};

  /** So a player can find themselves in the table at a glance. */
  get myId(): string {
    return this.profile.profile?.userId ?? '';
  }

  /**
   * A group's board is the day's scores with a membership filter.
   *
   * Loaded per group rather than filtered from the global board: that query is
   * capped, so a small group sitting outside the global top would silently
   * vanish from its own standings — the smaller the group, the likelier, which
   * is exactly backwards.
   */
  private loadBoards(): void {
    this.groups.groups.forEach((g) => this.play.leaderboard(g.groupId).subscribe({
      next: (board) => (this.boards[g.groupId] = board),
      error: () => undefined,
    }));
  }
  copied = '';

  constructor(
    readonly groups: GroupsService,
    readonly auth: AuthService,
    private readonly authUi: AuthUiService,
    private readonly play: PlayService,
    private readonly profile: ProfileService,
  ) {}

  ngOnInit(): void {
    if (!this.auth.signedIn) {
      this.loading = false;
      return;
    }
    this.refresh();
  }

  signIn(): void {
    this.authUi.open('signin');
  }

  refresh(): void {
    this.loading = true;
    this.groups.load().subscribe({
      next: () => {
        this.loading = false;
        this.loadBoards();
      },
      error: () => {
        this.error = 'Could not load your groups.';
        this.loading = false;
      },
    });
  }

  create(): void {
    const name = this.newName.trim();
    if (!name || this.busy) return;
    this.run(this.groups.create(name), () => (this.newName = ''));
  }

  join(): void {
    const code = this.joinCode.trim();
    if (!code || this.busy) return;
    this.run(this.groups.join(code), () => (this.joinCode = ''));
  }

  leave(group: Group): void {
    if (this.busy) return;
    this.run(this.groups.leave(group.groupId));
  }

  regenerate(group: Group): void {
    if (this.busy) return;
    this.run(this.groups.regenerateCode(group.groupId));
  }

  copy(group: Group): void {
    if (!group.inviteCode) return;
    void navigator.clipboard?.writeText(group.inviteCode);
    this.copied = group.groupId;
    setTimeout(() => (this.copied = ''), 1500);
  }

  isOwner(group: Group): boolean {
    return group.ownerId === this.auth.userId;
  }

  private run(obs: { subscribe: Function }, onDone?: () => void): void {
    this.busy = true;
    this.error = '';
    (obs as any).subscribe({
      next: () => {
        this.busy = false;
        onDone?.();
        this.refresh();
      },
      error: (err: any) => {
        this.busy = false;
        // The server's message is the useful one here: a bad code and a full
        // group are both things the person can act on.
        this.error = err?.error?.error?.message
          || err?.error?.message
          || 'That did not work.';
      },
    });
  }
}
