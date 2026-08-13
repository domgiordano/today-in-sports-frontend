import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

interface TokenSet {
  idToken: string;
  accessToken: string;
  expiresAt: number;
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

  constructor() {
    this.tokens = this.load();
  }

  private get domain(): string {
    return `https://${environment.cognitoDomain}.auth.${environment.awsRegion}.amazoncognito.com`;
  }

  private get redirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  }

  // ------------------------------------------------------------- session

  get idToken(): string | null {
    if (!this.tokens) return null;
    // A minute of slack, so a request never leaves with a token that expires
    // in flight.
    if (Date.now() >= this.tokens.expiresAt - 60_000) {
      this.signOut();
      return null;
    }
    return this.tokens.idToken;
  }

  get signedIn(): boolean {
    return this.idToken !== null;
  }

  signOut(): void {
    this.tokens = null;
    localStorage.removeItem(STORAGE_KEY);
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
    this.tokens = tokens;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
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
