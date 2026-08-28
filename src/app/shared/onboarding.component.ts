import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

/**
 * The one thing asked of somebody the first time they sign in.
 *
 * Blocking, deliberately. A skippable prompt produces accounts with no name,
 * which the leaderboard then has to render as "Unnamed player" and every later
 * feature — mentions, comments, a friends list — has to carry a branch for. It
 * is two fields once, against a branch in every feature after it.
 *
 * It asks for both at once because the server takes both at once: two requests
 * would let the second fail and leave somebody half-registered with no way to
 * tell which half.
 */
@Component({
  selector: 'app-onboarding',
  template: `
    <div class="scrim" *ngIf="open" role="dialog" aria-modal="true"
         aria-labelledby="onboarding-title">
      <div class="card">
        <h2 id="onboarding-title">One thing before you play</h2>
        <p class="sub">
          A name for the boards and a username that is yours alone. You can
          change both later in settings.
        </p>

        <label>
          Display name
          <input [(ngModel)]="displayName" name="displayName" maxlength="40"
                 placeholder="Dom" autocomplete="name"
                 (keydown.enter)="save()" />
        </label>

        <label>
          Username
          <span class="at-field">
            <span class="at" aria-hidden="true">&#64;</span>
            <input [(ngModel)]="username" name="username" maxlength="20"
                   placeholder="dom" autocomplete="off" spellcheck="false"
                   (ngModelChange)="error = ''" (keydown.enter)="save()" />
          </span>
        </label>
        <p class="hint">Letters, numbers and underscores. At least three.</p>

        <p class="error" *ngIf="error" role="alert">{{ error }}</p>

        <button class="primary" (click)="save()"
                [disabled]="!ready || saving">
          {{ saving ? 'Saving…' : 'Start playing' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./onboarding.component.scss'],
})
export class OnboardingComponent implements OnInit, OnDestroy {
  open = false;
  displayName = '';
  username = '';
  saving = false;
  error = '';

  private sub?: Subscription;

  constructor(
    private readonly profile: ProfileService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.ask();
    // Signing up happens in the toolbar dropdown without a navigation, so this
    // component is long since initialised by the time an account first exists.
    // Checking only on init meant the one person who most needs the prompt —
    // somebody who has just created an account — was the only person who never
    // saw it, until a reload they had no reason to perform. They played their
    // first round nameless instead, which is exactly the state this prompt was
    // built to prevent.
    this.sub = this.auth.changed.subscribe((signedIn) => {
      if (signedIn) this.ask();
      else this.open = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /**
   * Only ever for a signed-in player. An anonymous visitor naming themselves is
   * the end-of-round prompt's job, and it is not blocking there because they
   * have not asked us for anything yet.
   */
  private ask(): void {
    if (!this.auth.signedIn) return;
    this.profile.load().subscribe({
      next: (me) => (this.open = !!me.needsOnboarding),
      error: () => { /* a failed load is not a reason to trap somebody */ },
    });
  }

  get ready(): boolean {
    return this.displayName.trim().length > 0
      && this.username.trim().replace(/^@/, '').length >= 3;
  }

  save(): void {
    if (!this.ready || this.saving) return;
    this.saving = true;
    this.error = '';
    this.profile.setIdentity(this.displayName, this.username).subscribe({
      next: () => {
        this.saving = false;
        this.open = false;
      },
      error: (err) => {
        this.saving = false;
        // The server's message is the useful one — "that username is taken",
        // "letters, numbers and underscores only" — so it is shown rather
        // than replaced with something vaguer.
        this.error = err?.error?.error?.message
          || 'Could not save that. Try again.';
      },
    });
  }
}
