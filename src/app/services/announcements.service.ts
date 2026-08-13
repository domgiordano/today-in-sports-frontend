import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Announcement {
  announcementId: string;
  title: string;
  body: string;
  severity: 'info' | 'notice' | 'warning';
  dismissible: boolean;
  endsAt: string;
}

const DISMISSED_KEY = 'tis.dismissedAnnouncements';

/**
 * Product announcements.
 *
 * Dismissal is stored locally. That is a deliberate limit rather than an
 * oversight: making it follow you across devices means a write on every page
 * load, and an announcement is not worth that.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  /** Never throws — a failure here must not stop a page rendering. */
  forPlacement(placement: 'landing' | 'results'): Observable<Announcement[]> {
    return this.http
      .get<{ announcements: Announcement[] }>(
        `${environment.apiBase}/play/announcements?placement=${placement}`,
      )
      .pipe(
        map((r) => (r.announcements ?? []).filter((a) => !this.isDismissed(a))),
        catchError(() => of([])),
      );
  }

  constructor(private readonly http: HttpClient) {}

  isDismissed(a: Announcement): boolean {
    return this.dismissed().includes(a.announcementId);
  }

  dismiss(a: Announcement): void {
    const all = new Set(this.dismissed());
    all.add(a.announcementId);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...all]));
    } catch {
      // A full or blocked store is not a reason to fail; the announcement
      // simply reappears next time, which is the harmless failure.
    }
  }

  private dismissed(): string[] {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
    } catch {
      return [];
    }
  }
}
