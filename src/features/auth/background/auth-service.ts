import type {
  AuthResult,
  AuthState,
  TalkientAuthResponse,
  TalkientUser,
} from '../types';
import {
  clearAuthState,
  getAuthState,
  saveAuthenticatedSession,
} from './auth-storage';

const DEFAULT_API_BASE_URL = 'https://api.talkient.app';
const REFRESH_LEEWAY_MS = 60_000;

/**
 * API client contract for Talkient auth endpoints.
 */
interface TalkientAuthClient {
  exchangeCode(code: string): Promise<TalkientAuthResponse>;
  refreshToken(refreshToken: string): Promise<TalkientAuthResponse>;
  logout(accessToken: string): Promise<void>;
}

/**
 * Sign in with Google through Talkient API + Chrome Identity launchWebAuthFlow.
 */
export async function signInWithGoogle(
  interactive: boolean = true,
): Promise<AuthResult> {
  try {
    const redirectUri = chrome.identity.getRedirectURL();
    const authStartUrl = buildAuthStartUrl(redirectUri);
    const callbackUrl = await launchWebAuthFlow(authStartUrl, interactive);
    const code = extractCodeFromRedirect(callbackUrl);

    if (!code) {
      return {
        success: false,
        error: 'Authorization code not returned by OAuth flow',
      };
    }

    const tokenResponse = await talkientAuthClient.exchangeCode(code);
    const user = parseUserFromAccessToken(tokenResponse.accessToken);
    const expiresAt = Date.now() + tokenResponse.expiresIn * 1000;

    await saveAuthenticatedSession(
      user,
      tokenResponse.accessToken,
      tokenResponse.refreshToken,
      expiresAt,
    );

    return { success: true, user };
  } catch (error) {
    console.error('[Talkient.Auth] Sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sign-in error',
    };
  }
}

/**
 * Sign out current user and clear local auth state.
 */
export async function signOut(): Promise<AuthResult> {
  let logoutError: string | null = null;

  try {
    const state = await getAuthState();
    if (state.accessToken) {
      await talkientAuthClient.logout(state.accessToken);
    }
  } catch (error) {
    logoutError =
      error instanceof Error ? error.message : 'Unknown sign-out error';
  } finally {
    await clearAuthState();
  }

  if (logoutError) {
    return { success: false, error: logoutError };
  }

  return { success: true };
}

/**
 * Get the currently authenticated user, refreshing token if needed.
 */
export async function getCurrentUser(): Promise<TalkientUser | null> {
  const state = await getRefreshedAuthState();
  return state.user;
}

/**
 * Check whether current user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const state = await getRefreshedAuthState();
  return state.isAuthenticated && !!state.user && !!state.accessToken;
}

/**
 * Get a valid access token, refreshing if needed.
 */
export async function getAccessToken(): Promise<string | null> {
  const state = await getRefreshedAuthState();
  return state.accessToken;
}

async function getRefreshedAuthState(): Promise<AuthState> {
  const state = await getAuthState();

  if (
    !state.isAuthenticated ||
    !state.user ||
    !state.accessToken ||
    !state.refreshToken ||
    !state.expiresAt
  ) {
    return state;
  }

  if (!isTokenExpiredOrNearExpiry(state.expiresAt)) {
    return state;
  }

  try {
    const refreshed = await talkientAuthClient.refreshToken(state.refreshToken);
    const refreshedUser = parseUserFromAccessToken(refreshed.accessToken);
    const refreshedExpiresAt = Date.now() + refreshed.expiresIn * 1000;

    await saveAuthenticatedSession(
      refreshedUser,
      refreshed.accessToken,
      refreshed.refreshToken,
      refreshedExpiresAt,
    );

    return {
      isAuthenticated: true,
      user: refreshedUser,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshedExpiresAt,
    };
  } catch (error) {
    console.warn(
      '[Talkient.Auth] Refresh failed, clearing local session:',
      error,
    );
    await clearAuthState();
    return {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    };
  }
}

function isTokenExpiredOrNearExpiry(expiresAt: number): boolean {
  return expiresAt <= Date.now() + REFRESH_LEEWAY_MS;
}

function buildAuthStartUrl(redirectUri: string): string {
  const url = new URL('/api/auth/google', getApiBaseUrl());
  url.searchParams.set('redirect_uri', redirectUri);
  return url.toString();
}

function getApiBaseUrl(): string {
  const override = (globalThis as { __TALKIENT_API_BASE_URL__?: string })
    .__TALKIENT_API_BASE_URL__;

  if (override && override.trim().length > 0) {
    return override;
  }

  return DEFAULT_API_BASE_URL;
}

async function launchWebAuthFlow(
  url: string,
  interactive: boolean,
): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive },
      (responseUrl?: string) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!responseUrl) {
          reject(new Error('OAuth flow was cancelled'));
          return;
        }

        resolve(responseUrl);
      },
    );
  });
}

function extractCodeFromRedirect(redirectUrl: string): string | null {
  try {
    const url = new URL(redirectUrl);
    return url.searchParams.get('code');
  } catch {
    return null;
  }
}

function parseUserFromAccessToken(accessToken: string): TalkientUser {
  const tokenParts = accessToken.split('.');
  if (tokenParts.length < 2) {
    throw new Error('Invalid access token format');
  }

  const payload = decodeJwtPayload(tokenParts[1]);

  const id = getStringClaim(payload, 'sub');
  const email = getStringClaim(payload, 'email');
  const name = getStringClaim(payload, 'name');
  const picture = getOptionalStringClaim(payload, 'picture');

  return {
    id,
    email,
    name,
    picture,
  };
}

function decodeJwtPayload(payloadBase64Url: string): Record<string, unknown> {
  const normalized = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  try {
    const decodedJson = atob(padded);
    const parsed = JSON.parse(decodedJson) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('JWT payload is not an object');
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('Invalid access token payload');
  }
}

function getStringClaim(
  payload: Record<string, unknown>,
  claim: string,
): string {
  const value = payload[claim];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Access token missing required "${claim}" claim`);
  }

  return value;
}

function getOptionalStringClaim(
  payload: Record<string, unknown>,
  claim: string,
): string | undefined {
  const value = payload[claim];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return undefined;
}

const talkientAuthClient: TalkientAuthClient = {
  async exchangeCode(code: string): Promise<TalkientAuthResponse> {
    return postAuthPayload('/api/auth/google/extension-callback', { code });
  },

  async refreshToken(refreshToken: string): Promise<TalkientAuthResponse> {
    return postAuthPayload('/api/auth/refresh', { refreshToken });
  },

  async logout(accessToken: string): Promise<void> {
    const response = await fetch(new URL('/api/auth/logout', getApiBaseUrl()), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Logout failed with status ${response.status}`);
    }
  },
};

async function postAuthPayload(
  endpoint: string,
  body: Record<string, string>,
): Promise<TalkientAuthResponse> {
  const response = await fetch(new URL(endpoint, getApiBaseUrl()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Auth request failed with status ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return parseAuthResponse(json);
}

function parseAuthResponse(json: unknown): TalkientAuthResponse {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid auth response payload');
  }

  const payload = json as Record<string, unknown>;
  const accessToken = payload.accessToken;
  const refreshToken = payload.refreshToken;
  const expiresIn = payload.expiresIn;

  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresIn !== 'number'
  ) {
    throw new Error('Auth response is missing required fields');
  }

  return { accessToken, refreshToken, expiresIn };
}
