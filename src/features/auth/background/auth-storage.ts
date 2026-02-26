import type { AuthState, GoogleUser } from '../types';

const AUTH_STORAGE_KEY = 'talkient_auth_state';

/**
 * Default auth state when user is not authenticated
 */
const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  user: null,
  lastUpdated: 0,
};

/**
 * Get the current authentication state from storage
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
    const state = result[AUTH_STORAGE_KEY] as AuthState | undefined;
    return state ?? DEFAULT_AUTH_STATE;
  } catch (error) {
    console.error('[Talkient.Auth] Error getting auth state:', error);
    return DEFAULT_AUTH_STATE;
  }
}

/**
 * Save authentication state to storage
 */
export async function saveAuthState(state: AuthState): Promise<void> {
  try {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: state });
    console.log('[Talkient.Auth] Auth state saved');
  } catch (error) {
    console.error('[Talkient.Auth] Error saving auth state:', error);
    throw error;
  }
}

/**
 * Save user data after successful authentication
 */
export async function saveUser(user: GoogleUser): Promise<void> {
  const state: AuthState = {
    isAuthenticated: true,
    user,
    lastUpdated: Date.now(),
  };
  await saveAuthState(state);
}

/**
 * Clear authentication state (for sign out)
 */
export async function clearAuthState(): Promise<void> {
  try {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY);
    console.log('[Talkient.Auth] Auth state cleared');
  } catch (error) {
    console.error('[Talkient.Auth] Error clearing auth state:', error);
    throw error;
  }
}

/**
 * Get the currently stored user (if any)
 */
export async function getStoredUser(): Promise<GoogleUser | null> {
  const state = await getAuthState();
  return state.user;
}

/**
 * Check if user is authenticated based on stored state
 */
export async function isStoredAuthenticated(): Promise<boolean> {
  const state = await getAuthState();
  return state.isAuthenticated;
}
