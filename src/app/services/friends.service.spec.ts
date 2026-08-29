import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FriendsResponse, FriendsService, Player } from './friends.service';

function player(over: Partial<Player> = {}): Player {
  return {
    userId: 'u1', displayName: 'Ann', username: 'ann', totalPoints: 100,
    playCount: 5, currentStreak: 2, todayPoints: 40, todayCorrect: 3,
    playedToday: true, ...over,
  };
}

function response(over: Partial<FriendsResponse> = {}): FriendsResponse {
  return {
    quizDate: '2026-08-29', friends: [], board: [], incoming: [], outgoing: [],
    maxFriends: 150, ...over,
  };
}

describe('FriendsService', () => {
  let service: FriendsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(FriendsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('is empty before anything loads, rather than throwing', () => {
    expect(service.friends).toEqual([]);
    expect(service.board).toEqual([]);
    expect(service.incoming).toEqual([]);
  });

  it('separates friends from the two directions of pending', () => {
    service.load().subscribe();
    http.expectOne((r) => r.url.endsWith('/account/friends')).flush(response({
      friends: [player({ userId: 'f1' })],
      incoming: [player({ userId: 'i1' })],
      outgoing: [player({ userId: 'o1' })],
    }));

    expect(service.friends.map((p) => p.userId)).toEqual(['f1']);
    expect(service.incoming.map((p) => p.userId)).toEqual(['i1']);
    expect(service.outgoing.map((p) => p.userId)).toEqual(['o1']);
  });

  describe('the board', () => {
    it('is hidden when you are the only one on it', () => {
      // A board of one is not a ranking, it is a mirror.
      service.load().subscribe();
      http.expectOne((r) => r.url.endsWith('/account/friends'))
        .flush(response({ board: [player({ isYou: true })] }));
      expect(service.board).toEqual([]);
    });

    it('appears as soon as there is somebody to compare against', () => {
      service.load().subscribe();
      http.expectOne((r) => r.url.endsWith('/account/friends')).flush(response({
        board: [player({ userId: 'a' }), player({ userId: 'b', isYou: true })],
      }));
      expect(service.board.length).toBe(2);
    });
  });

  describe('actions', () => {
    it('strips a leading @ so both forms work', () => {
      service.act('request', '@ann').subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/account/friends-action'));
      expect(req.request.body).toEqual({ action: 'request', username: 'ann' });
      req.flush({});
    });

    it('trims whitespace', () => {
      service.act('accept', '  bob  ').subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/account/friends-action'));
      expect(req.request.body.username).toBe('bob');
      req.flush({});
    });

    it('sends decline, withdraw and unfriend as the same remove', () => {
      // All three end the relationship; there is no separate verb for them
      // on the server, and inventing one here would drift from it.
      service.act('remove', 'cal').subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/account/friends-action'));
      expect(req.request.body.action).toBe('remove');
      req.flush({});
    });
  });

  it('keeps what it last knew when a request fails', () => {
    service.load().subscribe();
    http.expectOne((r) => r.url.endsWith('/account/friends'))
      .flush(response({ friends: [player()] }));

    service.load().subscribe({ error: () => undefined });
    http.expectOne((r) => r.url.endsWith('/account/friends'))
      .error(new ProgressEvent('offline'));

    expect(service.friends.length).toBe(1);
    expect(service.loading).toBeFalse();
  });
});
