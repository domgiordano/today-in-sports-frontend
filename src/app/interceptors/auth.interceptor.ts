import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Attaches the Cognito id token to admin API calls.
 *
 * Scoped to the API host on purpose: bundled assets are same-origin static
 * files and must never carry a bearer token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(environment.apiBase)) return next.handle(req);

    const token = this.auth.idToken;
    if (!token) return next.handle(req);

    return next.handle(
      req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
    );
  }
}
