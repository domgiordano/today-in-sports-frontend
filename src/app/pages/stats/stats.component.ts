import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { Group, GroupsService } from '../../services/groups.service';
import {
  LeaderboardResponse,
  PlayService,
  SportAccuracy,
  StatsResponse,
} from '../../services/play.service';

/**
 * The numbers, on a page of their own.
 *
 * They existed before this — as a strip on the landing page and a panel behind
 * the admin gate — which meant the only way to see how play was going was to
 * scroll past the marketing or to be the one person with a console. This is the
 * same public rollup, sliceable, plus the two views that belong to whoever is
 * signed in: their own record and their groups'.
 *
 * Everything here is precomputed nightly and read by key, so the page costs the
 * same whether ten people play or ten thousand.
 */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnInit {
  stats?: StatsResponse;
  loading = true;

  /** Empty means everyone. */
  region = '';

  groups: Group[] = [];
  /** Today's board for the group being looked at, keyed by group id. */
  boards: Record<string, LeaderboardResponse> = {};

  constructor(
    private readonly play: PlayService,
    private readonly groupsApi: GroupsService,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadGroups();
  }

  get signedIn(): boolean {
    return this.auth.signedIn;
  }

  get regionOptions() {
    return this.stats?.regions ?? [];
  }

  pickRegion(country: string): void {
    if (this.region === country) return;
    this.region = country;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.play.stats(this.region || undefined).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.hasData) { this.stats = undefined; return; }
        // The server falls back to global for a region below its publishing
        // floor. Follow it, rather than leaving a chip lit for a slice that is
        // not what is on screen.
        this.region = res.scope.startsWith('region#') ? res.scope.split('#')[1] : '';
        this.stats = res;
      },
      error: () => { this.loading = false; this.stats = undefined; },
    });
  }

  /**
   * Groups, and today's standing within each.
   *
   * Group numbers are not on the public stats route: play endpoints carry no
   * claims, so membership cannot be established there. They ride on the
   * groups endpoint, which already knows who is asking.
   */
  private loadGroups(): void {
    if (!this.signedIn) return;
    this.groupsApi.load().subscribe({
      next: (res) => {
        this.groups = res.groups ?? [];
        this.groups.forEach((g) => this.play.leaderboard(g.groupId).subscribe({
          next: (board) => (this.boards[g.groupId] = board),
          error: () => undefined,
        }));
      },
      error: () => (this.groups = []),
    });
  }

  boardFor(group: Group) {
    return (this.boards[group.groupId]?.leaderboard ?? []).slice(0, 5);
  }

  /** Sports ordered by how often they have been asked, not alphabetically. */
  get sportRows(): { sport: string; label: string; accuracy: number; asked: number }[] {
    const bySport = this.stats?.all?.bySport ?? {};
    return Object.entries(bySport as Record<string, SportAccuracy>)
      .map(([sport, v]) => ({
        sport, label: this.sportLabel(sport), accuracy: v.accuracy, asked: v.asked,
      }))
      .sort((a, b) => b.asked - a.asked);
  }

  sportLabel(key: string): string {
    const names: Record<string, string> = {
      mlb: 'Baseball', nba: 'Basketball', nhl: 'Hockey',
      soccer: 'Soccer', f1: 'Formula One', nfl: 'Football',
      news: 'Narrative',
    };
    // An unfamiliar label beats a blank row where a sport should be.
    return names[key] ?? key;
  }

  /** The trend, scaled to its own busiest day so a quiet week still reads. */
  get trendBars(): { date: string; rounds: number; height: number }[] {
    const trend = this.stats?.trend ?? [];
    const peak = Math.max(1, ...trend.map((d) => d.rounds));
    return trend.map((d) => ({
      date: d.date, rounds: d.rounds,
      height: Math.round((d.rounds / peak) * 100),
    }));
  }

  format(n: number): string {
    return (n ?? 0).toLocaleString('en-US');
  }
}
