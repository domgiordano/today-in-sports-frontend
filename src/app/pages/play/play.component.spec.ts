import { Observable } from 'rxjs';
/**
 * Ordering questions: placing, and rearranging by drag.
 *
 * This is the one interaction that has never been exercised against a real
 * question — an ordering question only appears on the days the assembler picks
 * one, and it has not since the drag was written. So it is pinned here instead.
 *
 * The component is constructed directly rather than through TestBed: none of
 * this touches the template, and a rendering harness would test Angular rather
 * than the rule that a row cannot be dragged before it is placed.
 */

import { PlayComponent } from './play.component';
import { LeaderboardRow } from '../../services/play.service';

type Args = ConstructorParameters<typeof PlayComponent>;

const ITEMS = ['Robinson', 'Maris', 'Aaron', 'Ripken'];

function makeComponent(): PlayComponent {
  // Stubs: nothing here reaches a service, and naming each one would only
  // couple these tests to the order of the constructor.
  const component = new PlayComponent(
    ...(([{}, {}, {}, { profile: undefined }]) as unknown as Args));
  component.phase = 'playing';
  component.question = {
    index: 0, total: 5, questionId: 'q1', type: 'ordering', tier: 3,
    prompt: 'Order these', sport: 'mlb', options: null, items: [...ITEMS],
  } as NonNullable<PlayComponent['question']>;
  return component;
}

/** A drag event carrying just the parts the handlers read. */
function dragEvent(): DragEvent {
  return {
    preventDefault: () => undefined,
    dataTransfer: { setData: () => undefined, effectAllowed: '' },
  } as unknown as DragEvent;
}

describe('PlayComponent ordering', () => {
  it('places items in the order they are tapped', () => {
    const c = makeComponent();
    c.place('Aaron');
    c.place('Robinson');

    expect(c.positionOf('Aaron')).toBe(1);
    expect(c.positionOf('Robinson')).toBe(2);
    expect(c.positionOf('Maris')).toBe(0);
  });

  it('takes an item back out when it is tapped again', () => {
    const c = makeComponent();
    c.place('Aaron');
    c.place('Aaron');
    expect(c.positionOf('Aaron')).toBe(0);
  });

  it('lists placed items first, in order, then the rest', () => {
    const c = makeComponent();
    c.place('Ripken');
    c.place('Maris');

    expect(c.orderingRows).toEqual(['Ripken', 'Maris', 'Robinson', 'Aaron']);
    expect(c.rowIndexOf('Ripken')).toBe(0);
    expect(c.rowIndexOf('Robinson')).toBe(2);
  });

  it('only allows a placed item to be dragged', () => {
    const c = makeComponent();
    c.place('Aaron');

    expect(c.canDrag('Aaron')).toBeTrue();
    expect(c.canDrag('Maris')).toBeFalse();
  });

  it('does not allow dragging once the answer is in', () => {
    const c = makeComponent();
    c.place('Aaron');
    c.phase = 'revealing';
    expect(c.canDrag('Aaron')).toBeFalse();
  });

  it('moves a dragged item to the position it is dragged over', () => {
    const c = makeComponent();
    ITEMS.forEach((i) => c.place(i));

    c.dragStart('Ripken', dragEvent());
    c.dragOver('Maris', dragEvent());
    c.dragEnd();

    // Ripken lands where Maris was; everything below shuffles down.
    expect(c.orderingRows).toEqual(['Robinson', 'Ripken', 'Maris', 'Aaron']);
  });

  it('ignores a drag over an item that is not placed', () => {
    const c = makeComponent();
    c.place('Robinson');
    c.place('Aaron');

    c.dragStart('Aaron', dragEvent());
    c.dragOver('Maris', dragEvent());

    expect(c.orderingRows).toEqual(['Robinson', 'Aaron', 'Maris', 'Ripken']);
  });

  it('ignores a drag that never started', () => {
    const c = makeComponent();
    ITEMS.forEach((i) => c.place(i));

    c.dragOver('Aaron', dragEvent());

    expect(c.orderingRows).toEqual(ITEMS);
  });

  it('is only complete once every item is placed', () => {
    const c = makeComponent();
    ITEMS.slice(0, 3).forEach((i) => c.place(i));
    expect(c.canSubmit()).toBeFalse();

    c.place('Ripken');
    expect(c.canSubmit()).toBeTrue();
  });
});

describe('PlayComponent pick-four', () => {
  function multi(): PlayComponent {
    const c = makeComponent();
    c.question = {
      index: 0, total: 5, questionId: 'q2', type: 'multi', tier: 4,
      prompt: 'Which four started?', sport: 'mlb', chooseCount: 4,
      options: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], items: null,
    } as NonNullable<PlayComponent['question']>;
    return c;
  }

  it('lets a player submit fewer picks than the cap', () => {
    // Scoring subtracts a wrong pick from a right one, so naming only the two
    // you are sure of beats padding them out to four with guesses. Requiring a
    // full set turned every cautious answer into a reckless one.
    const c = multi();
    c.toggleChoice('a');
    c.toggleChoice('b');

    expect(c.chosen.length).toBe(2);
    expect(c.canSubmit()).toBeTrue();
  });

  it('still refuses an empty answer', () => {
    expect(multi().canSubmit()).toBeFalse();
  });

  it('never allows more than the question asked for', () => {
    const c = multi();
    ['a', 'b', 'c', 'd', 'e'].forEach((n) => c.toggleChoice(n));
    expect(c.chosen.length).toBe(4);
  });

  it('says a clean partial answer earned part marks', () => {
    const c = multi();
    ['a', 'b'].forEach((n) => c.toggleChoice(n));
    c.lastResult = { correctAnswer: ['a', 'b', 'c', 'd'] } as NonNullable<PlayComponent['lastResult']>;
    expect(c.multiNote).toContain('part marks');
  });

  it('credits the names found even when the other picks were wrong', () => {
    // Two right and two wrong used to score nothing, and the note existed to
    // explain that away. It now earns half, and the note says so.
    const c = multi();
    ['a', 'b', 'e', 'f'].forEach((n) => c.toggleChoice(n));
    c.lastResult = { correctAnswer: ['a', 'b', 'c', 'd'] } as NonNullable<PlayComponent['lastResult']>;

    expect(c.multiNote).toContain('2 of 4');
    expect(c.multiNote).toContain('part marks');
  });

  it('says so plainly when none of the picks were right', () => {
    const c = multi();
    ['e', 'f'].forEach((n) => c.toggleChoice(n));
    c.lastResult = { correctAnswer: ['a', 'b', 'c', 'd'] } as NonNullable<PlayComponent['lastResult']>;
    expect(c.multiNote).toContain('None of those');
  });

  it('says nothing at all when every pick was right', () => {
    const c = multi();
    ['a', 'b', 'c', 'd'].forEach((n) => c.toggleChoice(n));
    c.lastResult = { correctAnswer: ['a', 'b', 'c', 'd'] } as NonNullable<PlayComponent['lastResult']>;
    expect(c.multiNote).toBe('');
  });
});


describe('PlayComponent reactions', () => {
  /**
   * The shared factory stubs every service as `{}`, which is enough for the
   * ordering and pick-four tests because neither calls one. These do — the
   * whole point is what happens around the request — so the play service needs
   * the one method they exercise.
   */
  function withPlayStub(): PlayComponent {
    const c = makeComponent();
    (c as unknown as { play: { react: unknown } }).play = {
      react: () => new Observable(() => {}),
    };
    return c;
  }

  function row(over: Partial<LeaderboardRow> = {}): LeaderboardRow {
    return {
      position: 1, name: 'Dom', points: 900, correct: 4,
      anonymous: false, target: 'sub-1', reactions: {}, yourReaction: null,
      ...over,
    };
  }

  /**
   * The count moves on tap rather than on response. A leaderboard button that
   * sits inert until a round trip finishes reads as broken on a slow
   * connection, and the reload afterwards is what settles the true state.
   */
  it('shows the reaction immediately, before the request returns', () => {
    const c = withPlayStub();
    spyOnProperty(c, 'signedIn', 'get').and.returnValue(true);
    spyOn(c.play, 'react').and.returnValue(new Observable(() => {}));

    const r = row();
    c.react(r, '🔥');

    expect(r.yourReaction).toBe('🔥');
    expect(r.reactions?.['🔥']).toBe(1);
  });

  it('moves the count when the reaction changes rather than adding a second', () => {
    const c = withPlayStub();
    spyOnProperty(c, 'signedIn', 'get').and.returnValue(true);
    spyOn(c.play, 'react').and.returnValue(new Observable(() => {}));

    const r = row({ reactions: { '👏': 1 }, yourReaction: '👏' });
    c.react(r, '🔥');

    expect(r.yourReaction).toBe('🔥');
    expect(r.reactions?.['👏']).toBe(0);
    expect(r.reactions?.['🔥']).toBe(1);
  });

  it('treats the same emoji again as clearing it', () => {
    const c = withPlayStub();
    spyOnProperty(c, 'signedIn', 'get').and.returnValue(true);
    spyOn(c.play, 'react').and.returnValue(new Observable(() => {}));

    const r = row({ reactions: { '🔥': 1 }, yourReaction: '🔥' });
    c.react(r, '🔥');

    expect(r.yourReaction).toBeNull();
    expect(r.reactions?.['🔥']).toBe(0);
  });

  it('puts the row back the way it was when the request fails', () => {
    const c = withPlayStub();
    spyOnProperty(c, 'signedIn', 'get').and.returnValue(true);
    spyOn(c.play, 'react').and.returnValue(
      new Observable((s) => s.error(new Error('offline'))));

    const r = row({ reactions: { '👏': 1 }, yourReaction: '👏' });
    c.react(r, '🔥');

    expect(r.yourReaction).toBe('👏');
    expect(r.reactions?.['👏']).toBe(1);
  });

  it('does nothing for a signed-out visitor', () => {
    const c = withPlayStub();
    spyOnProperty(c, 'signedIn', 'get').and.returnValue(false);
    const spy = spyOn(c.play, 'react');

    const r = row();
    c.react(r, '🔥');

    expect(spy).not.toHaveBeenCalled();
    expect(r.yourReaction).toBeNull();
  });

  it('ignores a second tap while the first is still in flight', () => {
    const c = withPlayStub();
    spyOnProperty(c, 'signedIn', 'get').and.returnValue(true);
    const spy = spyOn(c.play, 'react').and.returnValue(new Observable(() => {}));

    const r = row();
    c.react(r, '🔥');
    c.react(r, '👏');

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
