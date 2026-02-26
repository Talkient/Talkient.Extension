import type { AuthResult, GoogleUser, GoogleUserInfoResponse } from '../types';
import {
  clearAuthState,
  getStoredUser,
  isStoredAuthenticated,
  saveUser,
} from './auth-storage';

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Sign in with Google using Chrome Identity API
 * @param interactive - Whether to show the sign-in prompt (true for user-initiated, false for silent)
 */
export async function signInWithGoogle(
  interactive: boolean = true,
): Promise<AuthResult> {
  console.log(
    '[Talkient.Auth] Starting Google sign-in, interactive:',
    interactive,
  );

  try {
    // Get OAuth token using Chrome Identity API
    const token = await getAuthToken(interactive);

    if (!token) {
      return {
        success: false,
        error: 'Failed to get authentication token',
      };
    }

    // Fetch user profile from Google
    const user = await fetchUserProfile(token);

    if (!user) {
      // Token might be invalid, remove it and fail
      await removeCachedToken(token);
      return {
        success: false,
        error: 'Failed to fetch user profile',
      };
    }

    // Save user to storage
    await saveUser(user);

    console.log('[Talkient.Auth] Sign-in successful for:', user.email);

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('[Talkient.Auth] Sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult> {
  console.log('[Talkient.Auth] Starting sign-out');

  try {
    // Get current token to revoke
    const token = await getAuthToken(false);

    if (token) {
      // Remove the cached token
      await removeCachedToken(token);

      // Optionally revoke the token on Google's side
      await revokeToken(token);
    }

    // Clear local auth state
    await clearAuthState();

    console.log('[Talkient.Auth] Sign-out successful');

    return { success: true };
  } catch (error) {
    console.error('[Talkient.Auth] Sign-out error:', error);

    // Still clear local state even if token revocation fails
    await clearAuthState();

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error during sign-out',
    };
  }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(): Promise<GoogleUser | null> {
  // First check stored user
  const storedUser = await getStoredUser();

  if (storedUser) {
    return storedUser;
  }

  // Try silent auth to check if user is still logged in
  const result = await signInWithGoogle(false);

  if (result.success && result.user) {
    return result.user;
  }

  return null;
}

/**
 * Check if the user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  // Check stored state first for quick response
  const storedAuth = await isStoredAuthenticated();

  if (storedAuth) {
    // Verify token is still valid with silent auth
    const token = await getAuthToken(false);
    return token !== null;
  }

  return false;
}

/**
 * Get OAuth token using Chrome Identity API
 */
async function getAuthToken(interactive: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive }, (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[Talkient.Auth] getAuthToken error:',
          chrome.runtime.lastError.message,
        );
        resolve(null);
        return;
      }
      // Handle both string token (older Chrome) and GetAuthTokenResult object (newer Chrome)
      const token = typeof result === 'string' ? result : result?.token;
      resolve(token ?? null);
    });
  });
}

/**
 * Remove a cached auth token
 */
async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          '[Talkient.Auth] removeCachedAuthToken error:',
          chrome.runtime.lastError.message,
        );
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Revoke the OAuth token on Google's servers
 */
async function revokeToken(token: string): Promise<void> {
  try {
    const response = await fetch(
      `https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(
        token,
      )}`,
    );
    if (!response.ok) {
      console.warn(
        '[Talkient.Auth] Token revocation returned status:',
        response.status,
      );
    }
  } catch (error) {
    console.warn('[Talkient.Auth] Token revocation failed:', error);
    // Non-critical, continue with sign-out
  }
}

/**
 * Fetch user profile from Google UserInfo API
 */
async function fetchUserProfile(token: string): Promise<GoogleUser | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('[Talkient.Auth] UserInfo API error:', response.status);
      return null;
    }

    const data = (await response.json()) as GoogleUserInfoResponse;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      verified_email: data.verified_email,
    };
  } catch (error) {
    console.error('[Talkient.Auth] Error fetching user profile:', error);
    return null;
  }
}
