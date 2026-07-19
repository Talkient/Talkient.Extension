import type { AuthState, TalkientUser } from '../types';

const AUTH_STORAGE_KEY = 'talkient_auth_state';

const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

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

export async function saveAuthState(state: AuthState): Promise<void> {
  try {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: state });
  } catch (error) {
    console.error('[Talkient.Auth] Error saving auth state:', error);
    throw error;
  }
}

export async function saveSession(
  user: TalkientUser,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<void> {
  await saveAuthState({
    isAuthenticated: true,
    user,
    accessToken,
    refreshToken,
    expiresAt,
  });
}

export async function clearAuthState(): Promise<void> {
  try {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('[Talkient.Auth] Error clearing auth state:', error);
    throw error;
  }
}

export async function getStoredUser(): Promise<TalkientUser | null> {
  const state = await getAuthState();
  return state.user;
}

export async function isStoredAuthenticated(): Promise<boolean> {
  const state = await getAuthState();
  return state.isAuthenticated;
}
