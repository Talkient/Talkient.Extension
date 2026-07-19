import type { AuthResult, TalkientTokenResponse, TalkientUser } from '../types';
import { clearAuthState, getAuthState, saveSession } from './auth-storage';

const DEFAULT_API_BASE_URL = 'https://api.talkient.app';
const LOCAL_API_BASE_URL = 'http://localhost:5000';
const API_BASE_URL_STORAGE_KEY = 'talkient_api_base_url';
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

function normalizeApiBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

async function getApiBaseUrl(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(API_BASE_URL_STORAGE_KEY);
    const override = result[API_BASE_URL_STORAGE_KEY];

    if (typeof override === 'string') {
      const normalizedOverride = normalizeApiBaseUrl(override);
      if (normalizedOverride) {
        return normalizedOverride;
      }
    }
  } catch (error) {
    console.warn(
      '[Talkient.Auth] Failed to read API base URL override:',
      error,
    );
  }

  const manifest = chrome.runtime.getManifest() as {
    host_permissions?: unknown;
  };
  const hostPermissions = Array.isArray(manifest.host_permissions)
    ? manifest.host_permissions
    : [];
  const hasLoopbackHostPermission = hostPermissions.some(
    (permission): permission is string =>
      typeof permission === 'string' &&
      (permission.includes('localhost') || permission.includes('127.0.0.1')),
  );

  if (hasLoopbackHostPermission) {
    return LOCAL_API_BASE_URL;
  }

  return DEFAULT_API_BASE_URL;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromToken(accessToken: string): TalkientUser | null {
  const claims = decodeJwtPayload(accessToken);
  if (!claims) return null;
  const id = claims['sub'] as string | undefined;
  const email = claims['email'] as string | undefined;
  const name = claims['name'] as string | undefined;
  if (!id || !email || !name) return null;
  return {
    id,
    email,
    name,
    picture: (claims['picture'] as string | undefined) ?? null,
  };
}

async function launchWebAuthFlowAsync(
  url: string,
  interactive: boolean,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive }, (responseUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(responseUrl ?? null);
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
): Promise<TalkientTokenResponse | null> {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/auth/google/extension-callback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as TalkientTokenResponse;
}

export async function signInWithGoogle(
  interactive: boolean = true,
): Promise<AuthResult> {
  console.log('[Talkient.Auth] Starting sign-in, interactive:', interactive);

  try {
    const apiBaseUrl = await getApiBaseUrl();
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = `${apiBaseUrl}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const responseUrl = await launchWebAuthFlowAsync(authUrl, interactive);

    if (!responseUrl) {
      return {
        success: false,
        error: 'No redirect URL received from auth flow',
      };
    }

    const parsedUrl = new URL(responseUrl);
    const code = parsedUrl.searchParams.get('code');

    if (!code) {
      const error =
        parsedUrl.searchParams.get('error') ?? 'No authorization code received';
      return { success: false, error };
    }

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return { success: false, error: 'Failed to exchange authorization code' };
    }

    const user = userFromToken(tokens.accessToken);
    if (!user) {
      return { success: false, error: 'Failed to decode user from token' };
    }

    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    await saveSession(user, tokens.accessToken, tokens.refreshToken, expiresAt);

    console.log('[Talkient.Auth] Sign-in successful for:', user.email);
    return { success: true, user };
  } catch (error) {
    console.error('[Talkient.Auth] Sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function refreshSession(): Promise<AuthResult> {
  console.log('[Talkient.Auth] Attempting session refresh');

  try {
    const apiBaseUrl = await getApiBaseUrl();
    const state = await getAuthState();

    // Include stored refresh token in body as a fallback for environments where
    // cookies are not automatically forwarded. When the cookie IS present it
    // takes no effect (API prefers body token over cookie).
    const body = state.refreshToken ? { refreshToken: state.refreshToken } : {};

    const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Only clear stored state on explicit auth rejection, not on transient
      // errors like network timeouts or server 5xx responses.
      if (response.status === 401 || response.status === 403) {
        await clearAuthState();
      }
      return { success: false, error: 'Session expired or invalid' };
    }

    const tokens = (await response.json()) as TalkientTokenResponse;
    const user = userFromToken(tokens.accessToken);

    if (!user) {
      await clearAuthState();
      return {
        success: false,
        error: 'Failed to decode user from refreshed token',
      };
    }

    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    await saveSession(user, tokens.accessToken, tokens.refreshToken, expiresAt);

    console.log('[Talkient.Auth] Session refreshed for:', user.email);
    return { success: true, user };
  } catch (error) {
    console.error('[Talkient.Auth] Refresh error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function signOut(): Promise<AuthResult> {
  console.log('[Talkient.Auth] Starting sign-out');

  try {
    const apiBaseUrl = await getApiBaseUrl();
    const state = await getAuthState();

    if (state.accessToken) {
      const response = await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn(
          '[Talkient.Auth] Logout API call failed:',
          response.status,
        );
      }
    }

    await clearAuthState();
    console.log('[Talkient.Auth] Sign-out successful');
    return { success: true };
  } catch (error) {
    console.error('[Talkient.Auth] Sign-out error:', error);
    await clearAuthState();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error during sign-out',
    };
  }
}

export async function getCurrentUser(): Promise<TalkientUser | null> {
  const state = await getAuthState();

  if (state.user && state.accessToken) {
    const isTokenValid =
      state.expiresAt !== null &&
      state.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS;

    if (isTokenValid) {
      return state.user;
    }
  }

  const result = await refreshSession();
  if (result.success && result.user) {
    return result.user;
  }

  return null;
}
