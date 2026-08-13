import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Badge {
  id: string;
  name: string;
  description: string;
}

export interface Profile {
  userId: string;
  email?: string;
  displayName?: string;
  createdAt?: string;
  playCount: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  totalCorrect: number;
  lastPlayedDate?: string;
  country?: string;
  subdivision?: string;
  badges: Badge[];
  allBadges: Badge[];
}

/**
 * The signed-in player's own record.
 *
 * Fetching it is also what creates it: the backend upserts on read, which is
 * why nothing here has to care whether this is a first visit.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  profile?: Profile;

  constructor(private readonly http: HttpClient) {}

  load(): Observable<Profile> {
    return this.http
      .get<Profile>(`${environment.apiBase}/account/me`)
      .pipe(tap((p) => (this.profile = p)));
  }

  /**
   * Set or clear a self-declared region.
   *
   * A country and optionally a state, and nothing finer. It exists so a
   * leaderboard can be filtered, not so we know where anybody lives.
   */
  setRegion(country: string, subdivision?: string) {
    return this.http.post<{ country?: string; subdivision?: string }>(
      `${environment.apiBase}/account/profile`,
      { country: country || null, subdivision: subdivision || null },
    );
  }

  /** Badges still to earn, so a profile shows the road ahead as well as behind. */
  unearned(): Badge[] {
    const held = new Set((this.profile?.badges ?? []).map((b) => b.id));
    return (this.profile?.allBadges ?? []).filter((b) => !held.has(b.id));
  }
}
