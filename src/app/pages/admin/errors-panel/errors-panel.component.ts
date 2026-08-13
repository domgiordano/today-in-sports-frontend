import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../../../environments/environment';

interface ErrorRow {
  bucket: string;
  loggedAt: string;
  path: string;
  method: string;
  status: number;
  email?: string;
  durationMs?: number;
  error?: string;
}

interface ErrorsResponse {
  bucket: string;
  count: number;
  rows: ErrorRow[];
  byPath: { path: string; count: number }[];
}

/**
 * What is currently broken.
 *
 * The API had no operational view at all until now: the error hook wrote to a
 * module that did not exist, inside a try/except that swallowed the failure.
 * This is the read side of fixing that.
 */
@Component({
  selector: 'app-errors-panel',
  templateUrl: './errors-panel.component.html',
  styleUrls: ['./errors-panel.component.scss'],
})
export class ErrorsPanelComponent implements OnInit {
  readonly buckets = [
    { key: 'error', label: 'Failures' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'ok', label: 'Successful' },
  ];

  bucket = 'error';
  data?: ErrorsResponse;
  loading = true;
  error = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  select(bucket: string): void {
    if (this.bucket === bucket) return;
    this.bucket = bucket;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.http
      .get<ErrorsResponse>(
        `${environment.apiBase}/admin/errors?bucket=${this.bucket}&limit=100`,
      )
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load the request log.';
          this.loading = false;
        },
      });
  }

  /** The timestamp carries a nanosecond suffix to keep the key unique. */
  when(row: ErrorRow): string {
    const iso = (row.loggedAt || '').split('#')[0];
    return iso ? new Date(iso).toLocaleString() : '—';
  }

  severity(row: ErrorRow): string {
    if (row.status >= 500 || row.error) return 'bad';
    if (row.status >= 400) return 'warn';
    return 'good';
  }
}
