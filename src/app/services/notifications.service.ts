import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type NotificationKind = 'mention' | 'reaction' | 'reply';

export interface AppNotification {
  notificationId: string;
  kind: NotificationKind;
  /** Already resolved to a display name by the API — never a raw user id. */
  actor: string;
  groupId?: string | null;
  groupName?: string | null;
  quizDate?: string | null;
  commentId?: string | null;
  preview?: string | null;
  read: boolean;
  createdAt: string;
}

/** How often the bell asks, while the tab is actually being looked at. */
const POLL_MS = 90_000;

/**
 * The bell.
 *
 * Polls rather than holds a socket: the whole payload is a short list of short
 * strings, and a websocket for that is a second connection, a reconnect story
 * and an idle cost, in exchange for making a notification arrive a minute
 * earlier than it otherwise would. Nothing here is time-critical enough to be
 * worth that.
 *
 * Polling stops while the tab is hidden and resumes on return, with an
 * immediate fetch — a backgrounded tab asking every ninety seconds forever is
 * how an app ends up making thousands of requests nobody is present to read.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  notifications: AppNotification[] = [];
  unread = 0;
  loading = false;

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onVisibility = () => this.sync();

  private base = `${environment.apiBase}/account`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stop();
  }

  /**
   * Match polling to whether anybody is there to see it. Called on sign-in, on
   * sign-out and whenever the tab is shown or hidden, so all four transitions
   * land in one place rather than being remembered separately at each.
   */
  sync(): void {
    const wanted = this.auth.signedIn && !document.hidden;
    if (wanted && !this.timer) {
      this.load().subscribe({ error: () => undefined });
      this.timer = setInterval(
        () => this.load().subscribe({ error: () => undefined }), POLL_MS);
    } else if (!wanted) {
      this.stop();
      if (!this.auth.signedIn) this.clear();
    }
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private clear(): void {
    this.notifications = [];
    this.unread = 0;
  }

  load(): Observable<{ unread: number; notifications: AppNotification[] }> {
    this.loading = true;
    return this.http
      .get<{ unread: number; notifications: AppNotification[] }>(
        `${this.base}/notifications`)
      .pipe(tap({
        next: (r) => {
          this.notifications = r.notifications ?? [];
          this.unread = r.unread ?? 0;
          this.loading = false;
        },
        // A bell that cannot reach the server keeps showing what it last knew.
        // Blanking the list on a dropped request would make a flaky connection
        // look like somebody's messages had been deleted.
        error: () => (this.loading = false),
      }));
  }

  /**
   * Mark one, or everything.
   *
   * Applied locally before the request rather than after: the badge is the
   * whole reason this exists, and a badge that lingers for a round trip after
   * you have plainly dealt with the thing feels broken. If the request fails
   * the next poll puts it back.
   */
  markRead(ids?: string[]): void {
    const targets = ids ?? this.notifications.filter((n) => !n.read)
      .map((n) => n.notificationId);
    if (!targets.length) return;

    const wanted = new Set(targets);
    for (const n of this.notifications) {
      if (wanted.has(n.notificationId)) n.read = true;
    }
    this.unread = this.notifications.filter((n) => !n.read).length;

    this.http.post(`${this.base}/notifications-action`,
      { action: 'read', notificationIds: targets })
      .subscribe({ error: () => undefined });
  }
}
