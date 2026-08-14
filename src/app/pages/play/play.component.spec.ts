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

type Play = ConstructorParameters<typeof PlayComponent>[0];
type AuthUi = ConstructorParameters<typeof PlayComponent>[1];

const ITEMS = ['Robinson', 'Maris', 'Aaron', 'Ripken'];

function makeComponent(): PlayComponent {
  const component = new PlayComponent({} as Play, {} as AuthUi);
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
