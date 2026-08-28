import {
  Component, EventEmitter, HostListener, OnDestroy, OnInit, Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../services/auth.service';
import {
  AppNotification, NotificationsService,
} from '../services/notifications.service';

/**
 * The bell in the toolbar.
 *
 * Opening it does not clear the badge. That is deliberate and it is the one
 * decision in here worth defending: a count that vanishes the instant you
 * glance at the tray is a count you cannot use to keep track of anything —
 * open it on the way past, and whatever you had not read yet is gone. Reading
 * a row marks that row; the "Mark all read" button does the rest, when you
 * mean it.
 */
@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  /**
   * Both this and the account menu suppress the document click that would
   * otherwise close them, so neither ever saw the other open. Two overlapping
   * dropdowns is not a state either was designed to be read in.
   */
  @Output() opened = new EventEmitter<void>();

  open = false;

  private sub?: Subscription;

  constructor(
    readonly notifications: NotificationsService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.notifications.sync();
    // Signing in happens in the dropdown beside this one, with no navigation,
    // so there is nothing else that would tell the bell to start.
    this.sub = this.auth.changed.subscribe(() => this.notifications.sync());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get signedIn(): boolean {
    return this.auth.signedIn;
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      this.opened.emit();
      // A tray opened after a while should not show a minute-old list.
      this.notifications.load().subscribe({ error: () => undefined });
    }
  }

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  markAll(event: MouseEvent): void {
    event.stopPropagation();
    this.notifications.markRead();
  }

  /**
   * Every notification is about something that happened in a group, so every
   * one of them opens that group's thread. A notification you cannot follow to
   * the thing it is about is just an alert.
   */
  go(n: AppNotification): void {
    this.notifications.markRead([n.notificationId]);
    this.open = false;
    // A reaction is on a round rather than in a group — the same round is
    // visible to every group you share — so there is no one thread to open.
    // The groups page is where reactions show, so that is where it lands.
    void this.router.navigate(['/groups'], {
      queryParams: n.groupId
        ? { open: n.groupId, day: n.quizDate || undefined }
        : {},
    });
  }

  /** Past tense, naming the actor, because that is the whole headline. */
  headline(n: AppNotification): string {
    const where = n.groupName ? ` in ${n.groupName}` : '';
    switch (n.kind) {
      case 'mention': return `${n.actor} mentioned you${where}`;
      case 'reaction': return `${n.actor} reacted to your round${where}`;
      default: return `${n.actor} replied${where}`;
    }
  }

  /** A reaction shows the emoji somebody actually left, not a stand-in for it. */
  icon(n: AppNotification): string {
    switch (n.kind) {
      case 'mention': return '@';
      case 'reaction': return n.preview || '\u{1F44F}';
      default: return '\u{1F4AC}';
    }
  }

  /**
   * The emoji is already the icon, so repeating it as the preview line would
   * print it twice on the same row.
   */
  preview(n: AppNotification): string | null {
    return n.kind === 'reaction' ? null : (n.preview || null);
  }

  /**
   * "4h", not a timestamp. Nobody reading a notification tray wants to subtract
   * dates, and the exact minute stops mattering within the hour.
   */
  ago(iso: string): string {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return '';
    const secs = Math.max(0, (Date.now() - then) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    if (secs < 86_400) return `${Math.floor(secs / 3600)}h`;
    if (secs < 604_800) return `${Math.floor(secs / 86_400)}d`;
    return `${Math.floor(secs / 604_800)}w`;
  }

  trackById(_: number, n: AppNotification): string {
    return n.notificationId;
  }
}
