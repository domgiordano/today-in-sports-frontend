import { Component, Input, OnInit } from '@angular/core';

import {
  Announcement,
  AnnouncementsService,
} from '../services/announcements.service';

/**
 * Product announcements, shown as a modal.
 *
 * Placed on the landing page and the results screen only. There is no
 * placement that interrupts a quiz in progress, and the backend will not
 * accept one — telling somebody about a new feature while they are trying to
 * answer a question makes both feel worse.
 */
@Component({
  selector: 'app-announcement',
  template: `
    <div class="ann-modal" *ngIf="current as a" (click)="dismiss(a)">
      <div class="ann-card" [class]="a.severity" (click)="$event.stopPropagation()">
        <span class="eyebrow">{{ label(a) }}</span>
        <h3>{{ a.title }}</h3>
        <p *ngIf="a.body">{{ a.body }}</p>
        <button class="primary" (click)="dismiss(a)">Got it</button>
      </div>
    </div>
  `,
  styleUrls: ['./announcement-banner.component.scss'],
})
export class AnnouncementBannerComponent implements OnInit {
  @Input() placement: 'landing' | 'results' = 'landing';

  queue: Announcement[] = [];

  constructor(private readonly announcements: AnnouncementsService) {}

  ngOnInit(): void {
    this.announcements.forPlacement(this.placement).subscribe((list) => {
      this.queue = list;
    });
  }

  get current(): Announcement | undefined {
    return this.queue[0];
  }

  label(a: Announcement): string {
    return { info: 'What’s new', notice: 'Notice', warning: 'Heads up' }[
      a.severity
    ] ?? 'Notice';
  }

  dismiss(a: Announcement): void {
    this.announcements.dismiss(a);
    this.queue = this.queue.slice(1);
  }
}
