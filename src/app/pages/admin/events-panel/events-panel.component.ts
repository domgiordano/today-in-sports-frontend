import { Component } from '@angular/core';

import { EventsService } from '../../../services/events.service';
import { SportEvent } from '../../../models/event.model';

/**
 * Browse what the detectors found for a calendar date.
 *
 * This answers a diagnostic question the review queue cannot: when a date is
 * short on questions, is it because the templates failed to turn events into
 * questions, or because no detector fired at all? Those need opposite fixes —
 * a new template versus a new detector — and guessing wastes a lot of time.
 */
@Component({
  selector: 'app-events-panel',
  templateUrl: './events-panel.component.html',
  styleUrls: ['./events-panel.component.scss'],
})
export class EventsPanelComponent {
  mmdd = this.today();
  sport = '';
  events: SportEvent[] = [];
  loading = false;
  searched = false;
  error = '';

  readonly sports = ['', 'mlb', 'nhl', 'nba', 'nfl', 'f1', 'soccer'];

  constructor(private readonly eventsService: EventsService) {}

  private today(): string {
    // Quiz dates are UTC, so the default should be too.
    const now = new Date();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${m}-${d}`;
  }

  search(): void {
    if (!/^\d{2}-\d{2}$/.test(this.mmdd)) {
      this.error = 'Use MM-DD, for example 08-13.';
      return;
    }
    this.error = '';
    this.loading = true;
    this.eventsService.forDate(this.mmdd, this.sport || undefined).subscribe({
      next: (events) => {
        this.events = events;
        this.loading = false;
        this.searched = true;
      },
      error: () => {
        this.error = 'Could not load events for that date.';
        this.loading = false;
      },
    });
  }

  bySport(): { sport: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const e of this.events) {
      counts.set(e.sport, (counts.get(e.sport) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([sport, count]) => ({ sport, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Notability is a 0-100 score; this buckets it for a visual cue. */
  band(score: number): string {
    if (score >= 95) return 'exceptional';
    if (score >= 85) return 'high';
    return 'normal';
  }
}
