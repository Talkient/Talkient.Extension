/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  clearAuthState,
  getAuthState,
  getStoredUser,
  isStoredAuthenticated,
  saveAuthenticatedSession,
  saveAuthState,
} from '../background/auth-storage';
import type { AuthState, TalkientUser } from '../types';

const mockStorage: Record<string, any> = {};

(global as any).chrome = {
  storage: {
    local: {
      get: jest.fn((key: string) =>
        Promise.resolve({ [key]: mockStorage[key] }),
      ),
      set: jest.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
      remove: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
    },
  },
};

describe('auth-storage', () => {
  const mockUser: TalkientUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  describe('getAuthState', () => {
    it('returns default auth state when storage is empty', async () => {
      const state = await getAuthState();

      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });

    it('returns stored auth state', async () => {
      const storedState: AuthState = {
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 30_000,
      };
      mockStorage['talkient_auth_state'] = storedState;

      const state = await getAuthState();

      expect(state).toEqual(storedState);
    });

    it('returns default auth state on storage errors', async () => {
      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const state = await getAuthState();

      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });
  });

  describe('saveAuthState', () => {
    it('saves auth state to storage', async () => {
      const state: AuthState = {
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 30_000,
      };

      await saveAuthState(state);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        talkient_auth_state: state,
      });
    });
  });

  describe('saveAuthenticatedSession', () => {
    it('stores authenticated state with tokens and expiration', async () => {
      const expiresAt = Date.now() + 30_000;
      await saveAuthenticatedSession(
        mockUser,
        'access-token',
        'refresh-token',
        expiresAt,
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        talkient_auth_state: {
          isAuthenticated: true,
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt,
        },
      });
    });
  });

  describe('clearAuthState', () => {
    it('removes auth state from storage', async () => {
      await clearAuthState();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        'talkient_auth_state',
      );
    });
  });

  describe('getStoredUser', () => {
    it('returns null when no user is stored', async () => {
      const user = await getStoredUser();

      expect(user).toBeNull();
    });

    it('returns stored user', async () => {
      mockStorage['talkient_auth_state'] = {
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 30_000,
      };

      const user = await getStoredUser();

      expect(user).toEqual(mockUser);
    });
  });

  describe('isStoredAuthenticated', () => {
    it('returns false when user is not authenticated', async () => {
      const result = await isStoredAuthenticated();
      expect(result).toBe(false);
    });

    it('returns true when user is authenticated', async () => {
      mockStorage['talkient_auth_state'] = {
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 30_000,
      };

      const result = await isStoredAuthenticated();
      expect(result).toBe(true);
    });
  });
});
