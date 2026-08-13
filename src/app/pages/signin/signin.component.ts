import { Component } from '@angular/core';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin',
  template: `
    <div class="signin">
      <div class="mark" aria-hidden="true"></div>
      <h1>Today in Sports</h1>
      <p>Admin access only. Sign in to review the question bank.</p>
      <button (click)="signIn()">Sign in</button>
    </div>
  `,
  styles: [`
    .signin {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: .8rem; text-align: center;
    }
    .mark {
      width: 20px; height: 20px; border-radius: 4px;
      background: var(--accent); transform: rotate(45deg); margin-bottom: .8rem;
    }
    h1 { margin: 0; font-size: 1.5rem; letter-spacing: -.01em; }
    p { margin: 0 0 .6rem; color: var(--text-dim); font-size: .92rem; }
    button { padding: .55rem 1.4rem; }
  `],
})
export class SigninComponent {
  constructor(private readonly auth: AuthService) {}

  signIn(): void {
    void this.auth.signIn();
  }
}
