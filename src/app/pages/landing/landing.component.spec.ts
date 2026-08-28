/**
 * The analytics view models.
 *
 * These decide what a visitor is told about play, from a payload that is
 * frequently partial: a rollup runs nightly, sport is only recorded on answers
 * written since it was added, and a region slice may be refused by the server.
 * The rules worth pinning are the ones about absent data, because that is the
 * normal case rather than the edge one.
 */

import { LandingComponent } from './landing.component';
import { StatsResponse } from '../../services/play.service';

type Play = ConstructorParameters<typeof LandingComponent>[0];
type Groups = ConstructorParameters<typeof LandingComponent>[1];
type Auth = ConstructorParameters<typeof LandingComponent>[2];

function make(): LandingComponent {
  return new LandingComponent({} as Play, {} as Groups, {} as Auth);
}

function stats(over: Partial<StatsResponse> = {}): StatsResponse {
  return {
    scope: 'global',
    hasData: true,
    regions: [],
    all: {
      rounds: 10, players: 4, avgPoints: 500, avgCorrect: 2.5,
      perfectRounds: 1, avgSeconds: 9, bestPoints: 900, bySport: {},
    },
    week: null,
    month: null,
    trend: [],
    ...over,
  } as StatsResponse;
}

describe('LandingComponent analytics', () => {
  it('orders sports by how often they were asked, not alphabetically', () => {
    const c = make();
    c.playStats = stats({
      all: { ...stats().all!, bySport: {
        f1: { asked: 10, correct: 5, accuracy: 0.5 },
        mlb: { asked: 90, correct: 45, accuracy: 0.5 },
        nhl: { asked: 40, correct: 10, accuracy: 0.25 },
      } },
    });

    expect(c.sportRows.map((r) => r.sport)).toEqual(['mlb', 'nhl', 'f1']);
  });

  it('gives sports the names people use for them', () => {
    const c = make();
    expect(c.sportLabel('mlb')).toBe('Baseball');
    expect(c.sportLabel('f1')).toBe('Formula One');
  });

  it('passes through a sport key it does not recognise', () => {
    // Better an unfamiliar label than a blank row where a sport should be.
    expect(make().sportLabel('kabaddi')).toBe('kabaddi');
  });

  it('reports no sports at all when none have been recorded', () => {
    const c = make();
    c.playStats = stats();
    expect(c.sportRows).toEqual([]);
  });

  it('survives a rollup written before sport was recorded', () => {
    // The field is absent on older rollups, not empty.
    const c = make();
    c.playStats = stats({ all: { ...stats().all!, bySport: undefined } as never });
    expect(c.sportRows).toEqual([]);
  });

  it('scales the trend to its own busiest day', () => {
    const c = make();
    c.playStats = stats({ trend: [
      { date: '2026-08-01', rounds: 5, players: 2, avgPoints: 100 },
      { date: '2026-08-02', rounds: 20, players: 9, avgPoints: 200 },
      { date: '2026-08-03', rounds: 10, players: 4, avgPoints: 150 },
    ] });

    expect(c.trendBars.map((b) => b.height)).toEqual([25, 100, 50]);
  });

  it('does not divide by zero on a week when nobody played', () => {
    const c = make();
    c.playStats = stats({ trend: [
      { date: '2026-08-01', rounds: 0, players: 0, avgPoints: 0 },
      { date: '2026-08-02', rounds: 0, players: 0, avgPoints: 0 },
    ] });

    expect(c.trendBars.map((b) => b.height)).toEqual([0, 0]);
  });

  it('shows only groups that have actually played', () => {
    const c = make();
    c.groups = [
      { groupId: 'a', name: 'Played', ownerId: 'o', memberCount: 3,
        members: [], stats: { rounds: 4 } as never },
      { groupId: 'b', name: 'Never', ownerId: 'o', memberCount: 2,
        members: [], stats: { rounds: 0 } as never },
      { groupId: 'c', name: 'No stats', ownerId: 'o', memberCount: 2,
        members: [], stats: null },
    ];

    expect(c.groupsWithStats.map((g) => g.name)).toEqual(['Played']);
  });

  it('offers only the regions the server says are worth offering', () => {
    const c = make();
    c.playStats = stats({ regions: [{ country: 'GB', players: 12 }] });
    expect(c.regionOptions.map((r) => r.country)).toEqual(['GB']);
  });
});
