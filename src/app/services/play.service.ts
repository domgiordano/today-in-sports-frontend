import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface PlayQuestion {
  index: number;
  total: number;
  questionId: string;
  type: 'mc' | 'numeric' | 'ordering' | 'clue' | 'map' | 'multi';
  tier: number;
  prompt: string;
  sport: string;
  league?: string;
  options: string[] | null;
  /** True when options exist but are being held back as a scored hint. */
  hintAvailable?: boolean;
  /** Ordering: the four items, pre-shuffled server-side. */
  items?: string[] | null;
  /** Pick-four: how many of the options are real. */
  chooseCount?: number | null;
  /** Clue ladder: only the rungs already paid for. */
  clues?: string[] | null;
  clueCount?: number | null;
  cluesTaken?: number | null;
  tolerance?: number | null;
}

export interface HintResponse {
  quizDate: string;
  index: number;
  /** Multiple choice: the four options. */
  options?: string[];
  /** Clue ladder: every rung revealed so far, including the new one. */
  clues?: string[];
  cluesTaken?: number;
  clueCount?: number;
  creditMultiplier: number;
}

export interface StartResponse {
  quizDate: string;
  state: 'playing' | 'complete';
  resumed?: boolean;
  anonymous?: boolean;
  totalPoints: number;
  correctCount?: number;
  total?: number;
  question?: PlayQuestion;
}

export interface AnswerResponse {
  quizDate: string;
  index: number;
  correct: boolean;
  credit: number;
  points: number;
  accuracyPoints: number;
  timeBonus: number;
  hintUsed?: boolean;
  seconds: number | null;
  totalPoints: number;
  correctAnswer: string | string[] | { lat: number; lng: number };
  venueName?: string | null;
  venuePlace?: string | null;
  sourceUrl?: string;
  state: 'playing' | 'complete';
  correctCount?: number;
  total?: number;
  question?: PlayQuestion;

  /** Present only for signed-in players, and only on the final answer. */
  streak?: number;
  longestStreak?: number;
  playCount?: number;
  newBadges?: { id: string; name: string; description: string }[];
}

export interface LeaderboardRow {
  position: number;
  name: string;
  points: number;
  correct: number;
  anonymous: boolean;
}

export interface LeaderboardResponse {
  quizDate: string;
  leaderboard: LeaderboardRow[];
  players: number;
  you: { points: number; correct: number; rank: number;
        name?: string; anonymous: boolean } | null;
}

export interface SportAccuracy { asked: number; correct: number; accuracy: number; }

export interface StatsRollup {
  rounds: number;
  players: number;
  avgPoints: number;
  avgCorrect: number;
  perfectRounds: number;
  avgSeconds: number;
  bestPoints: number;
  bySport: Record<string, SportAccuracy>;
}

export interface StatsResponse {
  scope: string;
  all: StatsRollup | null;
  week: StatsRollup | null;
  month: StatsRollup | null;
  /** Per-day series, oldest first. */
  trend: { date: string; rounds: number; players: number; avgPoints: number }[];
  computedAt?: string;
  hasData: boolean;
}

const DEVICE_KEY = 'tis.device';

/**
 * The play API.
 *
 * A player never needs an account. An anonymous visitor is identified by a
 * device id minted here and kept in localStorage — enough to hold one session
 * per day and to resume a refresh, and openly defeatable by clearing storage.
 * That is the right trade for a daily quiz: withholding someone's own result to
 * prevent a low-stakes replay costs more than the replay does.
 *
 * Signing in replaces the device id with a Cognito subject on the server side,
 * which is what makes a profile and streak survive a cleared browser.
 */
@Injectable({ providedIn: 'root' })
export class PlayService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  /** Stable per-browser id, minted on first play. */
  get deviceId(): string {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev-${crypto.randomUUID()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  get signedIn(): boolean {
    return this.auth.signedIn;
  }

  start(): Observable<StartResponse> {
    return this.http.post<StartResponse>(
      `${environment.apiBase}/play/start`, { deviceId: this.deviceId });
  }

  /**
   * Trade points for the multiple-choice options.
   *
   * A round trip rather than a local reveal: the options never travel with the
   * question, so asking for them is the same action as admitting to it.
   */
  hint(index: number): Observable<HintResponse> {
    return this.http.post<HintResponse>(
      `${environment.apiBase}/play/hint`,
      { deviceId: this.deviceId, index });
  }

  answer(
    index: number,
    value: string | number | string[] | { lat: number; lng: number } | null,
  ): Observable<AnswerResponse> {
    return this.http.post<AnswerResponse>(
      `${environment.apiBase}/play/answer`,
      { deviceId: this.deviceId, index, answer: value });
  }

  leaderboard(): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(
      `${environment.apiBase}/play/leaderboard?deviceId=${encodeURIComponent(this.deviceId)}`);
  }

  /**
   * Public play statistics, precomputed nightly.
   *
   * Aggregates only — no group scope, because a group is private by design.
   */
  stats(country?: string): Observable<StatsResponse> {
    const query = country ? `?country=${encodeURIComponent(country)}` : '';
    return this.http.get<StatsResponse>(`${environment.apiBase}/play/stats${query}`);
  }

  setName(name: string): Observable<unknown> {
    return this.http.post(`${environment.apiBase}/play/name`,
      { deviceId: this.deviceId, name });
  }
}
