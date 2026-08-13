import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { environment } from '../../../../environments/environment';

interface UserRow {
  userId: string;
  email?: string;
  displayName?: string;
  createdAt?: string;
  lastSeenAt?: string;
  lastPlayedDate?: string;
  playCount: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  badgeCount: number;
  groupIds: string[];
}

interface UsersResponse {
  count: number;
  users: UserRow[];
  summary: {
    total: number;
    everPlayed: number;
    playingToday: number;
    onAStreak: number;
  };
}

/** Who is playing, and how often. */
@Component({
  selector: 'app-users-panel',
  templateUrl: './users-panel.component.html',
  styleUrls: ['./users-panel.component.scss'],
})
export class UsersPanelComponent implements OnInit {
  data?: UsersResponse;
  loading = true;
  error = '';
  sortKey: keyof UserRow = 'lastSeenAt';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.http
      .get<UsersResponse>(`${environment.apiBase}/admin/users?limit=500`)
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load the user list.';
          this.loading = false;
        },
      });
  }

  sortBy(key: keyof UserRow): void {
    this.sortKey = key;
  }

  get rows(): UserRow[] {
    const rows = [...(this.data?.users ?? [])];
    const key = this.sortKey;
    return rows.sort((a, b) => {
      const x = a[key], y = b[key];
      if (typeof x === 'number' && typeof y === 'number') return y - x;
      return String(y ?? '').localeCompare(String(x ?? ''));
    });
  }

  when(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString() : '—';
  }
}
