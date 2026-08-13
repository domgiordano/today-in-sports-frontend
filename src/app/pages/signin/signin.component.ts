import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Not a page — a redirect.
 *
 * This used to render a screen whose only content was another "Sign in" button,
 * which is a step that exists for the router rather than the visitor. The route
 * survives so existing links and bookmarks still work, but it goes straight to
 * the hosted UI. Sign-in is otherwise reached from the toolbar dropdown.
 */
@Component({
  selector: 'app-signin',
  template: `<div class="redirecting"><p>Taking you to sign in…</p></div>`,
  styles: [`
    .redirecting {
      min-height: 60vh; display: flex; align-items: center; justify-content: center;
      color: #7c8ca6; font-size: .95rem;
    }
  `],
})
export class SigninComponent implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode') === 'signup'
      ? 'signup' : 'login';
    void this.auth.signIn(mode);
  }
}
