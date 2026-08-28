import { Observable, Subject, of, throwError } from 'rxjs';

import { OnboardingComponent } from './onboarding.component';

/**
 * The prompt shown once, the first time somebody signs in.
 *
 * Blocking is the design: a skippable version produces accounts with no name,
 * which the leaderboard renders as "Unnamed player" and every later feature
 * has to branch on.
 */
type Deps = ConstructorParameters<typeof OnboardingComponent>;

/** The fake session, whose `signedIn` can flip the way a real sign-in flips it. */
function auth(signedIn: boolean) {
  return { signedIn, changed: new Subject<boolean>() };
}

function make(profile: Partial<{
  needsOnboarding: boolean; displayName: string; username: string;
}> = {}, signedIn = true, loadFails = false,
  session = auth(signedIn),
): OnboardingComponent {
  const profileService = {
    load: () => loadFails
      ? throwError(() => new Error('offline'))
      : of({ needsOnboarding: false, ...profile }),
    setIdentity: () => of({}),
  };
  return new OnboardingComponent(
    ...([profileService, session] as unknown as Deps));
}

describe('OnboardingComponent', () => {
  it('asks a new account for a name and a handle', () => {
    const c = make({ needsOnboarding: true });
    c.ngOnInit();
    expect(c.open).toBe(true);
  });

  it('stays out of the way once both are set', () => {
    const c = make({ needsOnboarding: false, displayName: 'Dom', username: 'dom' });
    c.ngOnInit();
    expect(c.open).toBe(false);
  });

  it('asks the moment an account is created, without a reload', () => {
    // The bug this exists for: signing up happens in the toolbar dropdown with
    // no navigation, so checking only on init meant the one person who most
    // needs the prompt — somebody who has just made an account — was the only
    // person who never saw it. They played their first round nameless.
    const session = auth(false);
    const c = make({ needsOnboarding: true }, false, false, session);
    c.ngOnInit();
    expect(c.open).toBe(false);

    session.signedIn = true;
    session.changed.next(true);

    expect(c.open).toBe(true);
  });

  it('closes on sign-out rather than hanging over the next visitor', () => {
    const session = auth(true);
    const c = make({ needsOnboarding: true }, true, false, session);
    c.ngOnInit();
    expect(c.open).toBe(true);

    session.signedIn = false;
    session.changed.next(false);

    expect(c.open).toBe(false);
  });

  it('stops listening once destroyed', () => {
    const session = auth(false);
    const c = make({ needsOnboarding: true }, false, false, session);
    c.ngOnInit();
    c.ngOnDestroy();

    session.signedIn = true;
    session.changed.next(true);

    // A destroyed component that still reacts is a leak, and here it would
    // also raise a modal onto a page that no longer owns one.
    expect(c.open).toBe(false);
  });

  it('never appears for a signed-out visitor', () => {
    // Naming yourself anonymously is the end-of-round prompt's job, and it is
    // not blocking there because the visitor has not asked us for anything.
    const c = make({ needsOnboarding: true }, false);
    c.ngOnInit();
    expect(c.open).toBe(false);
  });

  it('does not trap somebody when the profile cannot be loaded', () => {
    const c = make({ needsOnboarding: true }, true, true);
    c.ngOnInit();
    expect(c.open).toBe(false);
  });

  it('will not submit without both fields', () => {
    const c = make({ needsOnboarding: true });
    c.displayName = 'Dom';
    c.username = '';
    expect(c.ready).toBe(false);
  });

  it('will not submit a handle shorter than three characters', () => {
    const c = make({ needsOnboarding: true });
    c.displayName = 'Dom';
    c.username = 'do';
    expect(c.ready).toBe(false);
  });

  it('ignores a leading @ when judging length', () => {
    const c = make({ needsOnboarding: true });
    c.displayName = 'Dom';
    c.username = '@dom';
    expect(c.ready).toBe(true);
  });

  it('closes once the identity is saved', () => {
    const c = make({ needsOnboarding: true });
    c.open = true;
    c.displayName = 'Dom';
    c.username = 'dom';
    c.save();
    expect(c.open).toBe(false);
  });

  it('shows the server reason rather than a vaguer one of its own', () => {
    // "That username is taken" is actionable; "something went wrong" is not.
    const c = make({ needsOnboarding: true });
    (c as unknown as { profile: { setIdentity: () => Observable<never> } })
      .profile.setIdentity = () => throwError(() => ({
        error: { error: { message: 'That username is taken.' } },
      }));
    c.open = true;
    c.displayName = 'Dom';
    c.username = 'dom';
    c.save();

    expect(c.error).toBe('That username is taken.');
    expect(c.open).toBe(true);
  });

  it('stays open when saving fails, so the answer is not lost', () => {
    const c = make({ needsOnboarding: true });
    (c as unknown as { profile: { setIdentity: () => Observable<never> } })
      .profile.setIdentity = () => throwError(() => new Error('offline'));
    c.open = true;
    c.displayName = 'Dom';
    c.username = 'dom';
    c.save();

    expect(c.open).toBe(true);
    expect(c.error).toBeTruthy();
  });
});
