import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { CognitoService } from './cognito.service';
import { environment } from '../../environments/environment';

interface TokenSet {
  idToken: string;
  accessToken: string;
  expiresAt: number;
  /** Kept so a session outlives the id token's hour. */
  refreshToken?: string;
}

const STORAGE_KEY = 'tis.auth';

/**
 * Cognito hosted-UI authentication, authorization-code flow with PKCE.
 *
 * PKCE rather than the implicit flow because this is a public client with no
 * secret — the code alone is useless to an interceptor without the verifier
 * that never leaves this browser.
 *
 * The API authorizer validates the **id** token, since that is what carries the
 * `email` claim the admin gate compares against ADMIN_EMAIL. The access token
 * would authenticate the caller but not identify them.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokens: TokenSet | null = null;

  /**
   * Fires whenever the session starts or ends.
   *
   * Sign-in happens in a dropdown without a navigation, so anything that has to
   * react to it — the bell, which must start polling — has no route change to
   * hang off and would otherwise sit idle until the next page load.
   */
  readonly changed = new Subject<boolean>();
  /** The single in-flight renewal, shared by every caller that arrives during it. */
  private renewal?: Promise<string | null>;

  constructor(private readonly cognito: CognitoService) {
    this.tokens = this.load();
  }

  private get domain(): string {
    return `https://${environment.cognitoDomain}.auth.${environment.awsRegion}.amazoncognito.com`;
  }

  private get redirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  }

  // ------------------------------------------------------------- session

  /** A minute of slack, so a request never leaves with a token expiring in flight. */
  private get valid(): boolean {
    return !!this.tokens && Date.now() < this.tokens.expiresAt - 60_000;
  }

  get idToken(): string | null {
    return this.valid ? this.tokens!.idToken : null;
  }

  /**
   * Signed in for as long as the session can be renewed.
   *
   * This used to sign the visitor out the moment the id token aged past its
   * hour, which is why a login never survived one. An expired id token with a
   * refresh token behind it is a live session, not a dead one.
   */
  get signedIn(): boolean {
    return !!this.tokens && (this.valid || !!this.tokens.refreshToken);
  }

  /**
   * The usable id token, renewed first if it has aged out.
   *
   * Concurrent callers share one in-flight renewal rather than each starting
   * their own and racing to save the result.
   */
  async freshIdToken(): Promise<string | null> {
    if (this.valid) return this.tokens!.idToken;

    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) {
      if (this.tokens) this.signOut();
      return null;
    }

    this.renewal ??= this.renew(refreshToken)
      .finally(() => { this.renewal = undefined; });
    return this.renewal;
  }

  private async renew(refreshToken: string): Promise<string | null> {
    try {
      this.save(await this.cognito.refresh(refreshToken));
      return this.tokens!.idToken;
    } catch {
      // The refresh token is spent or revoked; there is nothing left to try.
      this.signOut();
      return null;
    }
  }

  /**
   * Claims from the id token.
   *
   * Decoded, not verified — the server verifies. This is only ever used to
   * decide what the UI offers, never to grant anything. Every admin route is
   * enforced again server-side against ADMIN_EMAIL.
   */
  private get claims(): Record<string, unknown> | null {
    // The stored token, not the valid one: during the window where it has aged
    // out but is about to be renewed, the visitor is still signed in and the
    // avatar should not blank out. Nothing here grants anything.
    const token = this.tokens?.idToken;
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  get email(): string {
    return (this.claims?.['email'] as string) ?? '';
  }

  /** First letter of the email, for the avatar. */
  get initial(): string {
    return (this.email[0] ?? '?').toUpperCase();
  }

  /**
   * Whether to *show* admin controls. Not a security boundary — the API
   * enforces the same check, and a determined visitor editing this in devtools
   * gets a 403 rather than a review queue.
   */
  /** The Cognito subject — the id every server-side record is keyed on. */
  get userId(): string {
    return String(this.claims?.['sub'] ?? '');
  }

  get isAdmin(): boolean {
    const email = this.email.trim().toLowerCase();
    return !!email && email === environment.adminEmail.toLowerCase();
  }

  signOut(): void {
    this.tokens = null;
    localStorage.removeItem(STORAGE_KEY);
    this.changed.next(false);
  }

  private load(): TokenSet | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TokenSet) : null;
    } catch {
      return null;
    }
  }

  private save(tokens: TokenSet): void {
    const wasSignedIn = this.signedIn;
    this.tokens = tokens;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    // A silent token refresh is not a sign-in, and announcing it as one would
    // have every listener redo its work once an hour for nothing.
    if (!wasSignedIn) this.changed.next(true);
  }

  /**
   * Adopt tokens obtained by the in-app forms.
   *
   * The OAuth redirect is still used for federated providers, where the whole
   * point is that the credentials never touch this app.
   */
  adopt(tokens: TokenSet): void {
    this.save(tokens);
  }

  // --------------------------------------------------------------- login

  /**
   * Send the browser to Cognito's hosted UI.
   *
   * `mode` picks which screen lands first — the hosted UI has a separate
   * `/signup` route, so "create account" does not dump a new visitor on a login
   * form they have no credentials for. `identity_provider` skips the Cognito
   * form entirely and goes straight to the federated provider.
   */
  async signIn(mode: 'login' | 'signup' = 'login', provider?: string): Promise<void> {
    const verifier = this.randomString(64);
    sessionStorage.setItem('tis.pkce', verifier);

    const challenge = await this.sha256Base64Url(verifier);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: environment.cognitoClientId,
      redirect_uri: this.redirectUri,
      scope: 'email openid profile',
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    if (provider) params.set('identity_provider', provider);

    const path = mode === 'signup' && !provider ? 'signup' : 'oauth2/authorize';
    window.location.href = `${this.domain}/${path}?${params}`;
  }

  /**
   * Google is only offered when the identity provider is actually wired up.
   * Showing the button without it sends people to a Cognito error page.
   */
  get googleEnabled(): boolean {
    return environment.googleSignIn === true;
  }

  /** Exchange the authorization code. Returns false if the swap fails. */
  async completeSignIn(code: string): Promise<boolean> {
    const verifier = sessionStorage.getItem('tis.pkce');
    if (!verifier) return false;
    sessionStorage.removeItem('tis.pkce');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: environment.cognitoClientId,
      code,
      redirect_uri: this.redirectUri,
      code_verifier: verifier,
    });

    const res = await fetch(`${this.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return false;

    const json = await res.json();
    if (!json.id_token) return false;

    this.save({
      idToken: json.id_token,
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
      // Without this the federated session died after an hour too.
      refreshToken: json.refresh_token,
    });
    return true;
  }

  // --------------------------------------------------------------- PKCE

  private randomString(length: number): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => ('0' + b.toString(16)).slice(-2)).join('');
  }

  private async sha256Base64Url(value: string): Promise<string> {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value),
    );
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
