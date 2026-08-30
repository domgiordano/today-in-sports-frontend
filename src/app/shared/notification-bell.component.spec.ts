import { NotificationKind } from '../services/notifications.service';
import { NotificationBellComponent } from './notification-bell.component';

type Deps = ConstructorParameters<typeof NotificationBellComponent>;

function make(unread = 0) {
  const navigated: unknown[][] = [];
  const marked: (string[] | undefined)[] = [];
  const service = {
    notifications: [], unread, loading: false,
    sync: () => undefined,
    load: () => ({ subscribe: () => undefined }),
    markRead: (ids?: string[]) => marked.push(ids),
  };
  const c = new NotificationBellComponent(...([
    service,
    { signedIn: true, changed: { subscribe: () => undefined } },
    { navigate: (...a: unknown[]) => { navigated.push(a); return Promise.resolve(true); } },
  ] as unknown as Deps));
  return { c, navigated, marked, service };
}

function note(over = {}) {
  return {
    notificationId: 'n1', kind: 'mention', actor: 'Sam', groupId: 'g1',
    groupName: 'G', quizDate: '2026-08-28', commentId: 'c1',
    preview: 'hi', read: false, createdAt: new Date().toISOString(), ...over,
  } as never;
}

describe('NotificationBellComponent', () => {
  it('announces opening so the account menu can get out of the way', () => {
    // Both dropdowns suppress the document click that would close them, so
    // without this neither ever learns the other is open and they overlap.
    const { c } = make();
    const seen: number[] = [];
    c.opened.subscribe(() => seen.push(1));

    c.toggle(new MouseEvent('click'));
    expect(seen.length).toBe(1);

    c.toggle(new MouseEvent('click'));
    expect(seen.length).toBe(1);
  });

  it('does not clear the badge merely by being opened', () => {
    // The decision this component exists to make: a count that vanishes when
    // you glance at it cannot be used to keep track of anything.
    const { c, marked } = make(3);
    c.toggle(new MouseEvent('click'));
    expect(marked.length).toBe(0);
    expect(c.notifications.unread).toBe(3);
  });

  it('marks a row read and opens the thread it points at', () => {
    const { c, marked, navigated } = make(1);
    c.go(note());
    expect(marked).toEqual([['n1']]);
    expect(navigated[0][1]).toEqual({ queryParams: { open: 'g1', day: '2026-08-28' } });
  });

  it('still goes somewhere for a reaction, which belongs to no group', () => {
    const { c, navigated } = make(1);
    c.go(note({ kind: 'reaction', groupId: null, groupName: null, preview: '🔥' }));
    expect(navigated[0][0]).toEqual(['/groups']);
  });

  it('shows the emoji somebody actually left, and not twice', () => {
    const { c } = make();
    const r = note({ kind: 'reaction', preview: '🔥' });
    expect(c.icon(r)).toBe('🔥');
    expect(c.preview(r)).toBeNull();
  });

  // The guard for the whole class of bug that produced the friend-request one:
  // a kind was added to the union and to the backend, and the switch was never
  // updated, so it silently inherited the wrong sentence. Listing the kinds
  // here means adding one without a case fails immediately, rather than showing
  // somebody the wrong thing in production.
  it('gives every kind its own sentence, none inheriting the reply fallback', () => {
    const kinds: NotificationKind[] =
      ['mention', 'reaction', 'reply', 'friend_request', 'friend_accepted'];
    const { c } = make();

    const said = kinds.map((kind) => c.headline(note({ kind, groupName: null })));
    expect(new Set(said).size).toBe(kinds.length);

    const fallback = c.headline(note({ kind: 'reply', groupName: null }));
    const inherited = kinds
      .filter((k) => k !== 'reply')
      .filter((k) => c.headline(note({ kind: k, groupName: null })) === fallback);
    expect(inherited).toEqual([]);
  });

  describe('friend notifications', () => {
    // The bug this exists for: the default branch reads "replied", so a friend
    // request rendered as "Sam replied" — wrong, and unanswerable, since the
    // tray was the only place it appeared.
    it('says what actually happened', () => {
      const { c } = make();
      expect(c.headline(note({ kind: 'friend_request', groupName: null })))
        .toBe('Sam wants to be friends');
      expect(c.headline(note({ kind: 'friend_accepted', groupName: null })))
        .toBe('Sam accepted your friend request');
    });

    it('opens the friends page, where the request can be answered', () => {
      const { c, navigated } = make(1);
      c.go(note({ kind: 'friend_request', groupId: null, groupName: null }));
      expect(navigated[0][0]).toEqual(['/friends']);
    });

    it('does not drag a stale group into the link', () => {
      // A friend request carries no group, but nothing stops one arriving with
      // stale context; the friends page is right either way.
      const { c, navigated } = make(1);
      c.go(note({ kind: 'friend_accepted' }));
      expect(navigated[0][0]).toEqual(['/friends']);
    });
  });

  it('names the actor and the group in the headline', () => {
    const { c } = make();
    expect(c.headline(note())).toBe('Sam mentioned you in G');
    expect(c.headline(note({ kind: 'reply' }))).toBe('Sam replied in G');
  });
});
