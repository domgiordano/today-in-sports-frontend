import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface PlayedRound {
  quizDate: string;
  points: number;
  correct: number;
  total: number;
  seconds: number | null;
}

export interface HistoryWindow {
  roundsPlayed: number;
  avgPoints: number;
  avgCorrect: number;
  bestPoints: number;
  perfectRounds: number;
}

export interface History {
  days: number;
  through: string;
  rounds: PlayedRound[];
  bySport: Record<string, { asked: number; correct: number; accuracy: number }>;
  window: HistoryWindow;
}

/** One cell of the strip. `round` is null for a day nobody played. */
export interface Day {
  date: string;
  round: PlayedRound | null;
}

/**
 * Your own rounds.
 *
 * The API returns only the days that were actually played, and deliberately
 * does not pad the gaps — a day you did not play is not a day you scored
 * nothing. `strip()` expands that sparse list into a dense calendar for
 * drawing, keeping the distinction as `round: null` rather than a zero.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  history: History | null = null;
  loading = false;

  constructor(private readonly http: HttpClient) {}

  load(days = 30): Observable<History> {
    this.loading = true;
    return this.http
      .get<History>(`${environment.apiBase}/account/history?days=${days}`)
      .pipe(tap({
        next: (h) => { this.history = h; this.loading = false; },
        error: () => (this.loading = false),
      }));
  }

  /**
   * The window as a dense run of days, oldest first, so it reads left to right
   * the way a calendar does.
   */
  strip(): Day[] {
    const h = this.history;
    if (!h) return [];

    const byDate = new Map(h.rounds.map((r) => [r.quizDate, r]));
    const end = new Date(`${h.through}T00:00:00Z`);

    return Array.from({ length: h.days }, (_, i) => {
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - (h.days - 1 - i));
      const date = d.toISOString().slice(0, 10);
      return { date, round: byDate.get(date) ?? null };
    });
  }

  /**
   * How hard a day's cell is shaded, 0–1, relative to the best round in the
   * window. Relative rather than against a fixed maximum: the point of the
   * strip is to compare your days with each other, and against a theoretical
   * perfect score every real day looks the same shade of pale.
   */
  intensity(day: Day): number {
    const best = this.history?.window.bestPoints ?? 0;
    if (!day.round || best <= 0) return 0;
    return Math.max(0.15, day.round.points / best);
  }

  /** Sports you have actually been asked about, worst first — the gap is the interesting part. */
  sports(): { sport: string; accuracy: number; asked: number }[] {
    const by = this.history?.bySport ?? {};
    return Object.entries(by)
      .map(([sport, row]) => ({ sport, accuracy: row.accuracy, asked: row.asked }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }
}
