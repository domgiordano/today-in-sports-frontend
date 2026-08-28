import { GroupsComponent } from './groups.component';
import { Group } from '../../services/groups.service';

/**
 * Rendering a comment's @handles.
 *
 * Only handles belonging to this group are marked. Highlighting every @word
 * would style a stranger's name as though they were in the room, which is the
 * same mistake the server refuses to make when it resolves them.
 */
type Deps = ConstructorParameters<typeof GroupsComponent>;

function component(): GroupsComponent {
  return new GroupsComponent(...([{}, {}, {}, {}, {}] as unknown as Deps));
}

function group(handles: string[]): Group {
  return {
    groupId: 'g', name: 'G', ownerId: 'o', memberCount: handles.length,
    members: handles.map((h, i) => ({
      userId: `u${i}`, displayName: h, username: h, isOwner: false,
      position: i + 1, totalPoints: 0, playCount: 0, totalCorrect: 0,
      currentStreak: 0, longestStreak: 0, todayPoints: null,
      todayCorrect: null, playedToday: false,
    })),
  } as Group;
}

describe('GroupsComponent mention rendering', () => {
  it('marks a handle that belongs to the group', () => {
    const parts = component().parts(group(['dom']), 'nice one @dom');
    expect(parts).toEqual([
      { text: 'nice one ', mention: false },
      { text: '@dom', mention: true },
    ]);
  });

  it('leaves a handle from outside the group as plain text', () => {
    const parts = component().parts(group(['dom']), 'hello @stranger');
    expect(parts.every((p) => !p.mention)).toBe(true);
  });

  it('does not treat an email as a mention', () => {
    // Even where the domain matches a real member handle — the case that only
    // bites once somebody claims it.
    const parts = component().parts(group(['example']), 'mail sam@example.com');
    expect(parts.every((p) => !p.mention)).toBe(true);
  });

  it('marks several in one comment', () => {
    const parts = component().parts(group(['dom', 'sam']), '@dom and @sam');
    expect(parts.filter((p) => p.mention).map((p) => p.text))
      .toEqual(['@dom', '@sam']);
  });

  it('keeps the text either side intact', () => {
    const parts = component().parts(group(['dom']), 'a @dom b');
    expect(parts.map((p) => p.text).join('')).toBe('a @dom b');
  });

  it('handles a comment with nothing in it to mark', () => {
    const parts = component().parts(group(['dom']), 'just a comment');
    expect(parts).toEqual([{ text: 'just a comment', mention: false }]);
  });

  it('is case-insensitive about the handle', () => {
    const parts = component().parts(group(['dom']), '@DOM');
    expect(parts[0].mention).toBe(true);
  });
});
