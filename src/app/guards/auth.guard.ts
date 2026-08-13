import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Gate on the admin routes.
 *
 * In preview mode there is no backend and no pool, so the guard stands aside —
 * that is what lets the portal be judged without an AWS account.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    if (environment.useLocalSample || this.auth.signedIn) return true;
    this.router.navigate(['/signin']);
    return false;
  }
}
