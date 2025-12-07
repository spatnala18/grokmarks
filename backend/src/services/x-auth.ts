import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config';

// ============================================
// X OAuth 2.0 PKCE Authentication Service
// ============================================

// OAuth 2.0 endpoints (confirmed from X docs)
const AUTHORIZATION_URL = 'https://x.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.x.com/2/oauth2/token';

// Scopes required for Grokmarks
const SCOPES = ['tweet.read', 'users.read', 'bookmark.read', 'offline.access'];

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Generate PKCE code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Generate PKCE code challenge from verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

/**
 * Generate state parameter for CSRF protection
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Build the authorization URL for X OAuth 2.0
 */
export function buildAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.x.clientId,
    redirect_uri: config.x.redirectUri,
    scope: SCOPES.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${AUTHORIZATION_URL}?${params.toString()}`;
}

/**
 * Token response from X OAuth 2.0
 */
export interface TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  // Build form data
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: config.x.redirectUri,
    code_verifier: codeVerifier,
  });

  // X requires Basic auth with client credentials for confidential clients
  const credentials = Buffer.from(
    `${config.x.clientId}:${config.x.clientSecret}`
  ).toString('base64');

  const response = await axios.post<TokenResponse>(TOKEN_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
  });

  return response.data;
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const credentials = Buffer.from(
    `${config.x.clientId}:${config.x.clientSecret}`
  ).toString('base64');

  const response = await axios.post<TokenResponse>(TOKEN_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
  });

  return response.data;
}

/**
 * X User response from /2/users/me
 */
export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

/**
 * Get authenticated user info from X API
 */
export async function getAuthenticatedUser(accessToken: string): Promise<XUser> {
  const response = await axios.get<{ data: XUser }>(
    'https://api.x.com/2/users/me',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      params: {
        'user.fields': 'id,name,username,profile_image_url',
      },
    }
  );

  return response.data.data;
}
