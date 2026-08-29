import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Player {
  userId: string;
  displayName: string;
  username: string | null;
  totalPoints: number;
  playCount: number;
  currentStreak: number;
  /** Null, not zero — somebody who has not played has not scored nothing. */
  todayPoints: number | null;
  todayCorrect: number | null;
  playedToday: boolean;
  position?: number;
  isYou?: boolean;
}

export interface FriendsResponse {
  quizDate: string;
  friends: Player[];
  board: Player[];
  incoming: Player[];
  outgoing: Player[];
  maxFriends: number;
}

/**
 * Friends.
 *
 * Mutual, and added by handle only — there is no directory to search, the same
 * way groups have no browse. The only way to reach a player is to already know
 * who they are.
 */
@Injectable({ providedIn: 'root' })
export class FriendsService {
  data: FriendsResponse | null = null;
  loading = false;
  lastError = '';

  private base = `${environment.apiBase}/account`;

  constructor(private readonly http: HttpClient) {}

  load(): Observable<FriendsResponse> {
    this.loading = true;
    return this.http.get<FriendsResponse>(`${this.base}/friends`).pipe(
      tap({
        next: (r) => { this.data = r; this.loading = false; },
        error: () => (this.loading = false),
      }),
    );
  }

  /** `request`, `accept`, or `remove` — decline, withdraw and unfriend are all `remove`. */
  act(action: 'request' | 'accept' | 'remove', username: string): Observable<unknown> {
    return this.http.post(`${this.base}/friends-action`, {
      action,
      username: username.trim().replace(/^@/, ''),
    });
  }

  get friends(): Player[] { return this.data?.friends ?? []; }
  get incoming(): Player[] { return this.data?.incoming ?? []; }
  get outgoing(): Player[] { return this.data?.outgoing ?? []; }

  /**
   * The board, or nothing at all when you have no friends yet. A board of one
   * is not a ranking, it is a mirror.
   */
  get board(): Player[] {
    const rows = this.data?.board ?? [];
    return rows.length > 1 ? rows : [];
  }
}
