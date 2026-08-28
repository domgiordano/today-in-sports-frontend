import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { AuthUiService } from '../../services/auth-ui.service';
import { Group, GroupComment, GroupMember, GroupsService } from '../../services/groups.service';
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

  /** Mirrors the server's closed set — it refuses anything outside it
   *  regardless of what the client sends. */
  readonly palette = ['\u{1F44F}', '\u{1F525}', '\u{1F602}', '\u{1F631}', '\u{1F9E0}', '\u{1F480}'];

  /** The row mid-request, so its buttons cannot be double-tapped. */
  reactingTo = '';

  reactLabel(m: GroupMember, emoji: string): string {
    const n = m.reactions?.[emoji] ?? 0;
    const mine = m.yourReaction === emoji;
    if (!n) return `React ${emoji} to ${m.displayName}`;
    return `${emoji} ${n}${mine ? ', including yours' : ''} — ${m.displayName}`;
  }

  react(g: Group, m: GroupMember, emoji: string): void {
    if (this.reactingTo) return;
    this.reactingTo = m.userId;

    // Applied before the request so the button answers the tap; the refresh
    // settles it, because the server decides whether this was an add, a change
    // or a clear and the client's view can be stale.
    const previous = m.yourReaction ?? null;
    this.applyReaction(m, previous, previous === emoji ? null : emoji);

    this.play.react(m.userId, emoji).subscribe({
      next: () => {
        this.reactingTo = '';
        this.refresh();
      },
      error: () => {
        this.reactingTo = '';
        this.applyReaction(m, m.yourReaction ?? null, previous);
      },
    });
  }

  private applyReaction(
    m: GroupMember, from: string | null, to: string | null,
  ): void {
    const counts = { ...(m.reactions ?? {}) };
    if (from) counts[from] = Math.max(0, (counts[from] ?? 1) - 1);
    if (to) counts[to] = (counts[to] ?? 0) + 1;
    m.reactions = counts;
    m.yourReaction = to;
  }

  /** Threads keyed by group, loaded lazily — a group you have not opened is
   *  a request nobody asked for. */
  threads: Record<string, GroupComment[]> = {};
  draft: Record<string, string> = {};
  posting = '';
  openThread = '';

  toggleThread(g: Group): void {
    // Seeded so the template can bind straight to it without an optional
    // chain on every keystroke.
    this.draft[g.groupId] ??= '';
    this.openThread = this.openThread === g.groupId ? '' : g.groupId;
    if (this.openThread && !this.threads[g.groupId]) this.loadThread(g);
  }

  loadThread(g: Group): void {
    this.groups.comments(g.groupId).subscribe({
      next: (t) => (this.threads[g.groupId] = t.comments ?? []),
      error: () => (this.threads[g.groupId] = []),
    });
  }

  post(g: Group): void {
    const body = (this.draft[g.groupId] ?? '').trim();
    if (!body || this.posting) return;
    this.posting = g.groupId;
    this.groups.postComment(g.groupId, body).subscribe({
      next: () => {
        this.draft[g.groupId] = '';
        this.posting = '';
        // Reloaded rather than appended locally: the server owns the ordering
        // and the id, and guessing at both to save a request is how a list
        // ends up disagreeing with the thing it is a list of.
        this.loadThread(g);
      },
      error: () => (this.posting = ''),
    });
  }

  removeComment(g: Group, c: GroupComment): void {
    this.groups.deleteComment(g.groupId, c.commentId).subscribe({
      next: () => this.loadThread(g),
      error: () => undefined,
    });
  }

  /**
   * A comment split into plain runs and @handles, for rendering.
   *
   * Only handles belonging to this group are marked, using the member list the
   * table is already built from. Highlighting every @word would style a
   * stranger's name as though they were in the room.
   */
  parts(g: Group, body: string): { text: string; mention: boolean }[] {
    const handles = new Set(
      (g.members ?? [])
        .map((m) => (m.username ?? '').toLowerCase())
        .filter(Boolean),
    );
    const out: { text: string; mention: boolean }[] = [];
    const pattern = /(?<![\w.@])@([a-z0-9_]{3,20})/gi;
    let at = 0;
    for (let m = pattern.exec(body); m; m = pattern.exec(body)) {
      const known = handles.has(m[1].toLowerCase());
      if (!known) continue;
      if (m.index > at) out.push({ text: body.slice(at, m.index), mention: false });
      out.push({ text: m[0], mention: true });
      at = m.index + m[0].length;
    }
    if (at < body.length) out.push({ text: body.slice(at), mention: false });
    return out;
  }

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
