import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { History, HistoryService } from './history.service';

function history(over: Partial<History> = {}): History {
  return {
    days: 5, through: '2026-08-28', rounds: [], bySport: {},
    window: { roundsPlayed: 0, avgPoints: 0, avgCorrect: 0, bestPoints: 0, perfectRounds: 0 },
    ...over,
  };
}

const round = (quizDate: string, points: number) =>
  ({ quizDate, points, correct: 3, total: 5, seconds: 40 });

describe('HistoryService', () => {
  let service: HistoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(HistoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the window it was given', () => {
    service.load(7).subscribe();
    const req = http.expectOne((r) => r.url.includes('/account/history'));
    expect(req.request.url).toContain('days=7');
    req.flush(history());
  });

  describe('the strip', () => {
    it('is empty before anything loads', () => {
      expect(service.strip()).toEqual([]);
    });

    it('runs oldest first and ends on the day it was made for', () => {
      service.history = history();
      const days = service.strip().map((d) => d.date);
      expect(days).toEqual([
        '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
      ]);
    });

    it('leaves an unplayed day null rather than a zero', () => {
      // The API refuses to pad these for the same reason: a day you did not
      // play is not a day you scored nothing, and a zero would draw as one.
      service.history = history({ rounds: [round('2026-08-28', 40)] });
      const strip = service.strip();
      expect(strip[strip.length - 1].round?.points).toBe(40);
      expect(strip[0].round).toBeNull();
    });

    it('crosses a month boundary without inventing days', () => {
      service.history = history({ days: 3, through: '2026-09-01' });
      expect(service.strip().map((d) => d.date))
        .toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
    });
  });

  describe('shading', () => {
    it('is nothing at all for a day not played', () => {
      service.history = history({ window: { ...history().window, bestPoints: 50 } });
      expect(service.intensity({ date: '2026-08-24', round: null })).toBe(0);
    });

    it('fills a best day and keeps a weak one visible', () => {
      service.history = history({
        window: { ...history().window, bestPoints: 50 },
      });
      expect(service.intensity({ date: 'x', round: round('x', 50) })).toBe(1);
      // Floored, because a faint-to-invisible cell reads as "did not play".
      expect(service.intensity({ date: 'x', round: round('x', 1) })).toBe(0.15);
    });

    it('does not divide by a best of zero', () => {
      service.history = history();
      expect(service.intensity({ date: 'x', round: round('x', 0) })).toBe(0);
    });
  });

  describe('sports', () => {
    it('puts your worst first, which is the part worth seeing', () => {
      service.history = history({
        bySport: {
          nfl: { asked: 4, correct: 4, accuracy: 1 },
          mlb: { asked: 4, correct: 1, accuracy: 0.25 },
          nba: { asked: 4, correct: 2, accuracy: 0.5 },
        },
      });
      expect(service.sports().map((s) => s.sport)).toEqual(['mlb', 'nba', 'nfl']);
    });

    it('is empty rather than throwing before anything loads', () => {
      expect(service.sports()).toEqual([]);
    });
  });
});
