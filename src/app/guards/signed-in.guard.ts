import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Any signed-in account, unlike AdminGuard which is the admin alone.
 *
 * Sends a signed-out visitor home rather than to a sign-in page — sign-in lives
 * in the toolbar dropdown, so there is no page to send them to.
 */
@Injectable({ providedIn: 'root' })
export class SignedInGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    if (this.auth.signedIn) return true;
    void this.router.navigate(['/']);
    return false;
  }
}
