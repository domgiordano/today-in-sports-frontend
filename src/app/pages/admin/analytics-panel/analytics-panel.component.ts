import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { Group, GroupsService } from '../../../services/groups.service';

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

  /** Region scope. Empty means global. */
  country = '';
  /** Group scope. Set from the picker below; wins over country when both are set. */
  groupId = '';
  groups: Group[] = [];
  data?: AnalyticsResponse;
  loading = true;
  error = '';

  constructor(
    private readonly http: HttpClient,
    private readonly groupsApi: GroupsService,
  ) {}

  ngOnInit(): void {
    this.load();
    // The rollup writes a scope per group, so every group is already a slice
    // the API will answer for.
    this.groupsApi.load().subscribe({
      next: (res) => { this.groups = res.groups ?? []; },
      error: () => { this.groups = []; },
    });
  }

  pickGroup(groupId: string): void {
    this.groupId = groupId;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http
      .get<AnalyticsResponse>(
        `${environment.apiBase}/admin/analytics` + this.query())
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

  /** Group beats country: asking for both is a contradiction, not a filter. */
  private query(): string {
    if (this.groupId) return `?groupId=${encodeURIComponent(this.groupId)}`;
    if (this.country) return `?country=${encodeURIComponent(this.country)}`;
    return '';
  }

  value(period: string, metric: string): string {
    const row = this.data?.periods?.[period] as Record<string, unknown> | null;
    if (!row) return '—';
    const v = row[metric];
    return v === undefined || v === null ? '—' : String(v);
  }

  applyCountry(): void {
    this.country = this.country.trim().toUpperCase();
    this.load();
  }

  when(iso?: string): string {
    return iso ? new Date(iso).toLocaleString() : 'never';
  }
}
