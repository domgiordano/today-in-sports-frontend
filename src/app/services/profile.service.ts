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
  username?: string;
  /**
   * Whether the app should stop and ask before letting them carry on.
   *
   * Computed on the server rather than inferred here from two null checks, so
   * "what counts as onboarded" has one definition and changes in one place.
   */
  needsOnboarding?: boolean;
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

  /**
   * Set the name that appears on every board.
   *
   * On the profile rather than on a round, so it is retroactive: the
   * leaderboard reads a signed-in player's name from here at render time, and
   * changing it here renames them everywhere they have already appeared.
   */
  setDisplayName(name: string): Observable<Profile> {
    const trimmed = name.trim().slice(0, 40);
    return this.http
      .post<Profile>(`${environment.apiBase}/account/profile`,
                     { displayName: trimmed })
      .pipe(tap(() => {
        if (this.profile) this.profile.displayName = trimmed;
      }));
  }

  /**
   * Set the display name and @handle together, in one request.
   *
   * Together on purpose: onboarding asks for both, and two requests means a
   * player whose second one fails is left half-registered with no obvious way
   * to tell which half took. The server claims the handle first for the same
   * reason.
   */
  setIdentity(displayName: string, username: string): Observable<Profile> {
    return this.http
      .post<Profile>(`${environment.apiBase}/account/profile`, {
        displayName: displayName.trim().slice(0, 40),
        username: username.trim().replace(/^@/, ''),
      })
      .pipe(tap((p) => {
        if (this.profile) {
          this.profile.displayName = p.displayName;
          this.profile.username = p.username;
          this.profile.needsOnboarding = false;
        }
      }));
  }

  /** Badges still to earn, so a profile shows the road ahead as well as behind. */
  unearned(): Badge[] {
    const held = new Set((this.profile?.badges ?? []).map((b) => b.id));
    return (this.profile?.allBadges ?? []).filter((b) => !held.has(b.id));
  }
}
