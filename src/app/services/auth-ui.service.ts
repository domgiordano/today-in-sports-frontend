import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AuthMode = 'signin' | 'signup';

/**
 * Lets anywhere in the app ask the toolbar to open its sign-in dropdown.
 *
 * Without this, a "Create an account" button elsewhere has to navigate
 * somewhere — and navigating was the whole problem: the /signin route sent
 * people to Cognito's hosted UI, so the results screen quietly reintroduced the
 * page we had just removed.
 */
@Injectable({ providedIn: 'root' })
export class AuthUiService {
  private readonly requests = new Subject<AuthMode>();
  readonly opened = this.requests.asObservable();

  open(mode: AuthMode = 'signin'): void {
    this.requests.next(mode);
  }
}
