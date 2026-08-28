import { Observable, of, throwError } from 'rxjs';

import { OnboardingComponent } from './onboarding.component';

/**
 * The prompt shown once, the first time somebody signs in.
 *
 * Blocking is the design: a skippable version produces accounts with no name,
 * which the leaderboard renders as "Unnamed player" and every later feature
 * has to branch on.
 */
type Deps = ConstructorParameters<typeof OnboardingComponent>;

function make(profile: Partial<{
  needsOnboarding: boolean; displayName: string; username: string;
}> = {}, signedIn = true, loadFails = false): OnboardingComponent {
  const profileService = {
    load: () => loadFails
      ? throwError(() => new Error('offline'))
      : of({ needsOnboarding: false, ...profile }),
    setIdentity: () => of({}),
  };
  return new OnboardingComponent(
    ...([profileService, { signedIn }] as unknown as Deps));
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
