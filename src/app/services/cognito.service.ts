import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export interface TokenSet {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthOutcome {
  status: 'signedIn' | 'needsConfirmation' | 'needsNewPassword';
  tokens?: TokenSet;
  session?: string;
  email: string;
}

export class CognitoError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

/**
 * Cognito, called directly.
 *
 * No SDK: the Cognito Identity Provider API is JSON over HTTPS with an
 * `X-Amz-Target` header, and unauthenticated calls need no request signing. The
 * official client library would add hundreds of kilobytes to do this.
 *
 * Calling it directly is what lets sign-in live inside our own dropdown instead
 * of bouncing to Cognito's hosted UI, which cannot be styled and looks like a
 * different product mid-signup.
 *
 * Passwords are sent to Cognito's endpoint under TLS and are never stored, sent
 * anywhere else, or logged.
 */
@Injectable({ providedIn: 'root' })
export class CognitoService {
  private get endpoint(): string {
    return `https://cognito-idp.${environment.awsRegion}.amazonaws.com/`;
  }

  private async call<T>(action: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
      },
      body: JSON.stringify({ ClientId: environment.cognitoClientId, ...body }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = (json.__type ?? 'UnknownError').split('#').pop() as string;
      throw new CognitoError(code, json.message ?? 'Authentication failed.');
    }
    return json as T;
  }

  private toTokens(result: any): TokenSet {
    return {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      refreshToken: result.RefreshToken,
      expiresAt: Date.now() + (result.ExpiresIn ?? 3600) * 1000,
    };
  }

  async signIn(email: string, password: string): Promise<AuthOutcome> {
    const res: any = await this.call('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: password },
    });

    // An admin-created account arrives in FORCE_CHANGE_PASSWORD and must set a
    // real password before it has a session at all.
    if (res.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return { status: 'needsNewPassword', session: res.Session, email };
    }
    return { status: 'signedIn', tokens: this.toTokens(res.AuthenticationResult), email };
  }

  async completeNewPassword(email: string, password: string, session: string): Promise<AuthOutcome> {
    const res: any = await this.call('RespondToAuthChallenge', {
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: session,
      ChallengeResponses: { USERNAME: email, NEW_PASSWORD: password },
    });
    return { status: 'signedIn', tokens: this.toTokens(res.AuthenticationResult), email };
  }

  async signUp(email: string, password: string): Promise<AuthOutcome> {
    const res: any = await this.call('SignUp', {
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    });
    // Auto-confirmed pools skip the code entirely; ours does not, but the flag
    // is what says so rather than an assumption.
    return {
      status: res.UserConfirmed ? 'signedIn' : 'needsConfirmation',
      email,
    };
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    await this.call('ConfirmSignUp', { Username: email, ConfirmationCode: code });
  }

  async resendCode(email: string): Promise<void> {
    await this.call('ResendConfirmationCode', { Username: email });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.call('ForgotPassword', { Username: email });
  }

  /**
   * Turn a Cognito error code into something a person can act on.
   *
   * The raw messages are inconsistent and occasionally leak internals, and
   * `prevent_user_existence_errors` deliberately makes "no such user" and "wrong
   * password" indistinguishable — so both must read the same here too.
   */
  humanise(err: unknown): string {
    const code = err instanceof CognitoError ? err.code : '';
    switch (code) {
      case 'NotAuthorizedException':
      case 'UserNotFoundException':
        return 'That email and password do not match.';
      case 'UserNotConfirmedException':
        return 'Check your email for a confirmation code first.';
      case 'UsernameExistsException':
        return 'There is already an account with that email.';
      case 'InvalidPasswordException':
        return 'Password needs at least 8 characters and a number.';
      case 'CodeMismatchException':
        return 'That code is not right.';
      case 'ExpiredCodeException':
        return 'That code has expired — request a new one.';
      case 'LimitExceededException':
      case 'TooManyRequestsException':
        return 'Too many attempts. Wait a minute and try again.';
      case 'InvalidParameterException':
        return 'Check the email address and try again.';
      default:
        return err instanceof Error && err.message
          ? err.message
          : 'Something went wrong signing in.';
    }
  }
}
