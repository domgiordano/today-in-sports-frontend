import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../../../environments/environment';

interface Announcement {
  announcementId: string;
  title: string;
  body: string;
  severity: string;
  placements: string[];
  startsAt: string;
  endsAt: string;
}

/** Write an announcement, or take one down. */
@Component({
  selector: 'app-announcements-panel',
  templateUrl: './announcements-panel.component.html',
  styleUrls: ['./announcements-panel.component.scss'],
})
export class AnnouncementsPanelComponent implements OnInit {
  rows: Announcement[] = [];
  activeIds: string[] = [];
  loading = true;
  busy = false;
  error = '';

  title = '';
  body = '';
  severity = 'info';
  runDays = 14;
  onLanding = true;
  onResults = true;

  readonly severities = ['info', 'notice', 'warning'];

  constructor(private readonly http: HttpClient) {}

  private get url() {
    return `${environment.apiBase}/admin/announcements`;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.post<any>(this.url, { action: 'list' }).subscribe({
      next: (r) => {
        this.rows = r.announcements ?? [];
        this.activeIds = r.active ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load announcements.';
        this.loading = false;
      },
    });
  }

  get placements(): string[] {
    const out: string[] = [];
    if (this.onLanding) out.push('landing');
    if (this.onResults) out.push('results');
    return out;
  }

  create(): void {
    if (!this.title.trim() || this.busy || !this.placements.length) return;
    this.busy = true;
    this.error = '';
    this.http
      .post(this.url, {
        action: 'create',
        title: this.title.trim(),
        body: this.body.trim(),
        severity: this.severity,
        placements: this.placements,
        runDays: this.runDays,
      })
      .subscribe({
        next: () => {
          this.busy = false;
          this.title = '';
          this.body = '';
          this.load();
        },
        error: (err) => {
          this.busy = false;
          this.error = err?.error?.error?.message ?? 'Could not save that.';
        },
      });
  }

  end(row: Announcement): void {
    if (this.busy) return;
    this.busy = true;
    this.http
      .post(this.url, { action: 'end', announcementId: row.announcementId })
      .subscribe({
        next: () => {
          this.busy = false;
          this.load();
        },
        error: () => {
          this.busy = false;
          this.error = 'Could not take that down.';
        },
      });
  }

  isActive(row: Announcement): boolean {
    return this.activeIds.includes(row.announcementId);
  }

  when(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString() : '—';
  }
}
