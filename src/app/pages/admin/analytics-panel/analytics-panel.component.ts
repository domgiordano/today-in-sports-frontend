import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../../../environments/environment';

interface Rollup {
  rounds: number;
  players: number;
  avgPoints: number;
  avgCorrect: number;
  perfectRounds: number;
  avgSeconds: number;
  bestPoints: number;
  computedAt?: string;
}

interface AnalyticsResponse {
  scope: string;
  periods: Record<string, Rollup | null>;
  computedAt?: string;
  hasData: boolean;
}

/** Precomputed play statistics. Every figure is a keyed read. */
@Component({
  selector: 'app-analytics-panel',
  templateUrl: './analytics-panel.component.html',
  styleUrls: ['./analytics-panel.component.scss'],
})
export class AnalyticsPanelComponent implements OnInit {
  readonly periods = [
    { key: 'all', label: 'All time' },
    { key: 'month', label: 'This month' },
    { key: 'week', label: 'This week' },
  ];

  readonly metrics = [
    { key: 'rounds', label: 'Rounds played' },
    { key: 'players', label: 'Distinct players' },
    { key: 'avgPoints', label: 'Average score' },
    { key: 'avgCorrect', label: 'Average correct' },
    { key: 'perfectRounds', label: 'Perfect rounds' },
    { key: 'avgSeconds', label: 'Average seconds' },
    { key: 'bestPoints', label: 'Best score' },
  ] as const;

  data?: AnalyticsResponse;
  loading = true;
  error = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http
      .get<AnalyticsResponse>(`${environment.apiBase}/admin/analytics`)
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load analytics.';
          this.loading = false;
        },
      });
  }

  value(period: string, metric: string): string {
    const row = this.data?.periods?.[period] as Record<string, unknown> | null;
    if (!row) return '—';
    const v = row[metric];
    return v === undefined || v === null ? '—' : String(v);
  }

  when(iso?: string): string {
    return iso ? new Date(iso).toLocaleString() : 'never';
  }
}
