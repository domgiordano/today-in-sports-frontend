import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { AuthUiService } from '../../services/auth-ui.service';
import { Group, GroupsService } from '../../services/groups.service';

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
  copied = '';

  constructor(
    readonly groups: GroupsService,
    readonly auth: AuthService,
    private readonly authUi: AuthUiService,
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
      next: () => (this.loading = false),
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
