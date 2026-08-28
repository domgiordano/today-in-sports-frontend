import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { AppNotification, NotificationsService } from './notifications.service';

function fixture(over: Partial<AppNotification> = {}): AppNotification {
  return {
    notificationId: 'n1', kind: 'mention', actor: 'Sam', groupId: 'g1',
    groupName: 'The Group', quizDate: '2026-08-28', commentId: 'c1',
    preview: 'nice round', read: false, createdAt: '2026-08-28T10:00:00+00:00',
    ...over,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;
  let signedIn: boolean;

  beforeEach(() => {
    signedIn = true;
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{
        provide: AuthService,
        useValue: { get signedIn() { return signedIn; }, changed: { subscribe: () => undefined } },
      }],
    });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => service.ngOnDestroy());

  function respond(notifications: AppNotification[], unread?: number): void {
    const req = http.expectOne((r) => r.url.endsWith('/account/notifications'));
    req.flush({
      unread: unread ?? notifications.filter((n) => !n.read).length,
      notifications,
    });
  }

  it('reads the list and the count', () => {
    service.load().subscribe();
    respond([fixture(), fixture({ notificationId: 'n2', read: true })]);

    expect(service.notifications.length).toBe(2);
    expect(service.unread).toBe(1);
  });

  it('keeps what it last knew when a request fails', () => {
    service.load().subscribe();
    respond([fixture()]);

    service.load().subscribe({ error: () => undefined });
    http.expectOne((r) => r.url.endsWith('/account/notifications'))
      .error(new ProgressEvent('offline'));

    // Blanking on a dropped request would make a flaky connection look like
    // somebody's messages had been deleted.
    expect(service.notifications.length).toBe(1);
    expect(service.unread).toBe(1);
  });

  describe('marking read', () => {
    beforeEach(() => {
      service.load().subscribe();
      respond([fixture(), fixture({ notificationId: 'n2' })]);
    });

    it('drops the badge before the server answers', () => {
      service.markRead(['n1']);

      // Asserted before flushing: a badge that lingers for a round trip after
      // you have plainly dealt with the thing feels broken.
      expect(service.unread).toBe(1);
      expect(service.notifications[0].read).toBeTrue();

      const req = http.expectOne((r) => r.url.endsWith('/account/notifications-action'));
      expect(req.request.body).toEqual({ action: 'read', notificationIds: ['n1'] });
      req.flush({ marked: 1 });
    });

    it('marks only what was named', () => {
      service.markRead(['n1']);
      http.expectOne((r) => r.url.endsWith('/account/notifications-action')).flush({});

      expect(service.notifications[1].read).toBeFalse();
    });

    it('marks everything unread when given nothing', () => {
      service.markRead();
      const req = http.expectOne((r) => r.url.endsWith('/account/notifications-action'));

      expect(req.request.body.notificationIds).toEqual(['n1', 'n2']);
      expect(service.unread).toBe(0);
      req.flush({});
    });

    it('sends nothing when there is nothing unread', () => {
      service.markRead();
      http.expectOne((r) => r.url.endsWith('/account/notifications-action')).flush({});

      service.markRead();
      http.expectNone((r) => r.url.endsWith('/account/notifications-action'));
    });
  });

  describe('polling', () => {
    it('does not poll for a signed-out visitor', () => {
      signedIn = false;
      service.sync();
      http.expectNone((r) => r.url.endsWith('/account/notifications'));
    });

    it('fetches at once on sign-in rather than waiting a cycle', () => {
      service.sync();
      respond([fixture()]);
      expect(service.unread).toBe(1);
    });

    it('keeps asking while the tab is watched', fakeAsync(() => {
      service.sync();
      respond([]);

      tick(90_000);
      respond([fixture()]);
      expect(service.unread).toBe(1);

      service.ngOnDestroy();
    }));

    it('stops asking once signed out, and forgets the list', fakeAsync(() => {
      service.sync();
      respond([fixture()]);

      signedIn = false;
      service.sync();

      // Leaving somebody else's notifications on screen after a sign-out is a
      // leak, not a cache.
      expect(service.notifications).toEqual([]);
      expect(service.unread).toBe(0);

      tick(180_000);
      http.expectNone((r) => r.url.endsWith('/account/notifications'));
    }));

    it('does not start a second timer when already polling', fakeAsync(() => {
      service.sync();
      respond([]);
      service.sync();
      http.expectNone((r) => r.url.endsWith('/account/notifications'));

      tick(90_000);
      // One tick, one request — a second timer would double every poll for the
      // rest of the session.
      respond([]);
      service.ngOnDestroy();
    }));
  });

  afterEach(() => http.verify());
});
