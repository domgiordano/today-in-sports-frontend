import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { AuthUiService } from '../services/auth-ui.service';
import { CognitoService, TokenSet } from '../services/cognito.service';

type Mode = 'signin' | 'signup' | 'confirm' | 'newPassword' | 'sentReset';

/**
 * The toolbar, shared by every page.
 *
 * Sign-in and sign-up happen inside this dropdown rather than on a page or via
 * Cognito's hosted UI. Two reasons: an interstitial whose only content is
 * another sign-in button is a step that serves the router, not the visitor; and
 * the hosted UI cannot be styled, so it reads as a different product at exactly
 * the moment someone is deciding whether to trust one.
 *
 * The federated path still redirects, because the whole point of Google sign-in
 * is that the credentials never touch this app.
 */
@Component({
  selector: 'app-toolbar',
  templateUrl: './app-toolbar.component.html',
  styleUrls: ['./app-toolbar.component.scss'],
})
export class AppToolbarComponent implements OnInit, OnDestroy {
  @Input() stuck = false;
  /** 0–1 reading progress, or null to hide the bar. */
  @Input() progress: number | null = null;

  open = false;
  mode: Mode = 'signin';

  email = '';
  password = '';
  code = '';
  error = '';
  busy = false;

  private challengeSession = '';

  private sub?: Subscription;

  constructor(
    readonly auth: AuthService,
    private readonly cognito: CognitoService,
    private readonly authUi: AuthUiService,
  ) {}

  ngOnInit(): void {
    this.sub = this.authUi.opened.subscribe((mode) => {
      this.open = true;
      this.setMode(mode);
      // The dropdown lives in the sticky bar, so bring it into view when the
      // request came from somewhere further down the page.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get submitLabel(): string {
    switch (this.mode) {
      case 'signup': return 'Create account';
      case 'confirm': return 'Confirm';
      case 'newPassword': return 'Set password';
      default: return 'Sign in';
    }
  }

  canSubmit(): boolean {
    if (this.mode === 'confirm') return this.code.trim().length > 0;
    if (this.mode === 'newPassword') return this.password.length > 0;
    if (this.mode === 'sentReset') return false;
    return this.email.trim().length > 0 && this.password.length > 0;
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (!this.open) this.reset();
  }

  /** Any click outside closes it — a dropdown that traps you is worse than a page. */
  @HostListener('document:click')
  closeMenu(): void {
    if (this.open) {
      this.open = false;
      this.reset();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.error = '';
    if (mode === 'signin' || mode === 'signup') {
      this.code = '';
      this.password = '';
    }
  }

  private reset(): void {
    this.mode = 'signin';
    this.password = '';
    this.code = '';
    this.error = '';
    this.busy = false;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.busy) return;
    this.busy = true;
    this.error = '';

    try {
      if (this.mode === 'signin') {
        const out = await this.cognito.signIn(this.email.trim(), this.password);
        if (out.status === 'needsNewPassword') {
          this.challengeSession = out.session ?? '';
          this.password = '';
          this.setMode('newPassword');
        } else if (out.tokens) {
          this.finish(out.tokens);
        }

      } else if (this.mode === 'signup') {
        const out = await this.cognito.signUp(this.email.trim(), this.password);
        this.setMode(out.status === 'needsConfirmation' ? 'confirm' : 'signin');

      } else if (this.mode === 'confirm') {
        await this.cognito.confirmSignUp(this.email.trim(), this.code.trim());
        // Straight in — asking someone to retype a password they just chose is
        // a needless step.
        const out = await this.cognito.signIn(this.email.trim(), this.password);
        if (out.tokens) this.finish(out.tokens);
        else this.setMode('signin');

      } else if (this.mode === 'newPassword') {
        const out = await this.cognito.completeNewPassword(
          this.email.trim(), this.password, this.challengeSession);
        if (out.tokens) this.finish(out.tokens);
      }
    } catch (err) {
      this.error = this.cognito.humanise(err);
    } finally {
      this.busy = false;
    }
  }

  private finish(tokens: TokenSet): void {
    this.auth.adopt(tokens);
    this.open = false;
    this.reset();
  }

  async forgot(): Promise<void> {
    if (!this.email.trim()) {
      this.error = 'Enter your email first.';
      return;
    }
    this.busy = true;
    try {
      await this.cognito.forgotPassword(this.email.trim());
      this.setMode('sentReset');
    } catch (err) {
      this.error = this.cognito.humanise(err);
    } finally {
      this.busy = false;
    }
  }

  async resend(): Promise<void> {
    this.busy = true;
    try {
      await this.cognito.resendCode(this.email.trim());
      this.error = '';
    } catch (err) {
      this.error = this.cognito.humanise(err);
    } finally {
      this.busy = false;
    }
  }

  google(): void {
    this.open = false;
    void this.auth.signIn('login', 'Google');
  }

  signOut(): void {
    this.open = false;
    this.auth.signOut();
    window.location.href = '/';
  }
}
