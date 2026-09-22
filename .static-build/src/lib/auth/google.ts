import 'server-only';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Google OAuth 2.0 authorization-code flow with server-side ID-token
 * verification (spec §46, §47, §86). Only name, photo, email and the
 * Google provider ID are used — nothing else, no profile questionnaire.
 */

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const googleConfigured = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function googleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;        // provider ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

/** Exchange the authorization code and verify the ID token signature/claims. */
export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const tokens = await res.json();
  if (!tokens.id_token) throw new Error('no id_token in response');

  const { payload } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  if (payload.email_verified !== true) throw new Error('email not verified by Google');
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    email_verified: true,
    name: String(payload.name || payload.email),
    picture: payload.picture ? String(payload.picture) : undefined,
  };
}
