import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Gate on the admin routes.
 *
 * Signed in is not enough — the review queue is for the admin alone, so anyone
 * else is sent to the app rather than shown a screen that will only 403.
 *
 * This is UX, not security. The API checks the same thing against ADMIN_EMAIL
 * on every request, which is the check that actually matters.
 */
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    // Preview mode has no pool at all; the guard stands aside so the portal can
    // be worked on without an AWS account.
    if (environment.useLocalSample) return true;

    if (this.auth.isAdmin) return true;
    void this.router.navigate([this.auth.signedIn ? '/play' : '/']);
    return false;
  }
}
