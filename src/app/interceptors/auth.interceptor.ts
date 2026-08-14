import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';

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

    // Renew first if the id token has aged out. The request waits on the
    // renewal rather than leaving without a token and coming back a 401.
    return from(this.auth.freshIdToken()).pipe(
      switchMap((token) =>
        next.handle(
          token
            ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            : req,
        ),
      ),
    );
  }
}
