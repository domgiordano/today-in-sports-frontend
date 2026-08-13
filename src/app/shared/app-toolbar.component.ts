import { Component, HostListener, Input } from '@angular/core';

import { AuthService } from '../services/auth.service';
import { BallKind } from '../pages/landing/sport-ball.component';

/**
 * The toolbar, shared by every page.
 *
 * Previously each page carried its own copy, which drifted immediately — the
 * landing page grew a section nav the others never had, and the play screen had
 * a different sign-in affordance again.
 *
 * Sign-in is a dropdown rather than a route. An interstitial page whose only
 * content is another sign-in button is a step that exists for the router's
 * benefit, not the visitor's.
 */
@Component({
  selector: 'app-toolbar',
  template: `
    <header class="toolbar" [class.stuck]="stuck">
      <div class="inner">
        <a class="brand" routerLink="/">
          <app-sport-ball [kind]="ball" [size]="22"
                          fill="#f5a524" stroke="#0b1220" seam="#0b1220"></app-sport-ball>
          <span>Today in Sports</span>
        </a>

        <nav class="links">
          <a routerLink="/play" routerLinkActive="active">Play</a>
          <a routerLink="/" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: true }">Overview</a>
          <a routerLink="/docs" routerLinkActive="active">Docs</a>
        </nav>

        <div class="account">
          <ng-container *ngIf="!auth.signedIn; else signedIn">
            <button class="cta" (click)="toggle($event)"
                    [attr.aria-expanded]="open">
              Sign in
              <span class="caret" aria-hidden="true"></span>
            </button>

            <div class="menu" *ngIf="open" (click)="$event.stopPropagation()">
              <button (click)="go('login')">Sign in</button>
              <button (click)="go('signup')">Create an account</button>

              <ng-container *ngIf="auth.googleEnabled">
                <span class="divider"></span>
                <button class="google" (click)="google()">
                  <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36 45 30.6 45 24Z"/>
                    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.7-5.2c-1.9 1.3-4.4 2.2-7.8 2.2-6 0-11-4-12.8-9.4l-7 5.4C7.9 41 15.4 46 24 46Z"/>
                    <path fill="#FBBC05" d="M11.2 28.3A13.5 13.5 0 0 1 10.5 24c0-1.5.3-3 .7-4.3l-7-5.4A22 22 0 0 0 2 24c0 3.5.9 6.9 2.2 9.7l7-5.4Z"/>
                    <path fill="#EA4335" d="M24 9.5c3.4 0 5.7 1.5 7 2.7l5.9-5.7C33.3 3.1 29.9 1 24 1 15.4 1 7.9 6 4.2 14.3l7 5.4C13 14.3 18 9.5 24 9.5Z"/>
                  </svg>
                  Continue with Google
                </button>
              </ng-container>
            </div>
          </ng-container>

          <ng-template #signedIn>
            <button class="cta ghost" (click)="toggle($event)">
              Account<span class="caret" aria-hidden="true"></span>
            </button>
            <div class="menu" *ngIf="open" (click)="$event.stopPropagation()">
              <a routerLink="/admin" (click)="open = false">Review queue</a>
              <span class="divider"></span>
              <button (click)="signOut()">Sign out</button>
            </div>
          </ng-template>
        </div>
      </div>
      <div class="progress" *ngIf="progress !== null"
           [style.transform]="'scaleX(' + progress + ')'"></div>
    </header>
  `,
  styleUrls: ['./app-toolbar.component.scss'],
})
export class AppToolbarComponent {
  /** Sport shown in the brand mark; the landing page swaps it while scrolling. */
  @Input() ball: BallKind = 'baseball';
  @Input() stuck = false;
  /** 0–1 reading progress, or null to hide the bar. */
  @Input() progress: number | null = null;

  open = false;

  constructor(readonly auth: AuthService) {}

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  /** Any click outside closes it — a dropdown that traps you is worse than a page. */
  @HostListener('document:click')
  closeMenu(): void {
    this.open = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open = false;
  }

  go(mode: 'login' | 'signup'): void {
    this.open = false;
    void this.auth.signIn(mode);
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
