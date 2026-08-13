import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Lands here after the hosted UI redirect, swaps the code for tokens.
 *
 * Cognito reports consent and configuration problems as an `error` query
 * parameter rather than an HTTP failure, so that is surfaced instead of
 * silently bouncing back to a sign-in button that will fail the same way.
 */
@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="cb">
      <p *ngIf="!error">Signing in…</p>
      <div *ngIf="error">
        <h2>Sign-in failed</h2>
        <p class="detail">{{ error }}</p>
        <button (click)="retry()">Try again</button>
      </div>
    </div>
  `,
  styles: [`
    .cb { min-height: 100vh; display: flex; align-items: center;
          justify-content: center; text-align: center; color: var(--text-dim); }
    h2 { color: var(--text); margin: 0 0 .4rem; font-size: 1.1rem; }
    .detail { max-width: 40ch; margin: 0 auto 1rem; font-size: .9rem; }
  `],
})
export class AuthCallbackComponent implements OnInit {
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;

    const cognitoError = params.get('error');
    if (cognitoError) {
      this.error = params.get('error_description') || cognitoError;
      return;
    }

    const code = params.get('code');
    if (!code) {
      this.error = 'No authorization code was returned.';
      return;
    }

    const ok = await this.auth.completeSignIn(code);
    if (!ok) {
      this.error = 'Could not exchange the sign-in code for a session.';
      return;
    }
    // The app, not the review queue — most people signing in are players.
    void this.router.navigate(['/play']);
  }

  retry(): void {
    void this.router.navigate(['/signin']);
  }
}
