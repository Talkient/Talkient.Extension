/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAuthState,
  saveAuthState,
  saveSession,
  clearAuthState,
  getStoredUser,
  isStoredAuthenticated,
} from '../background/auth-storage';
import type { AuthState, TalkientUser } from '../types';

const mockStorage: Record<string, any> = {};

(global as any).chrome = {
  storage: {
    local: {
      get: jest.fn((key: string) => {
        return Promise.resolve({ [key]: mockStorage[key] });
      }),
      set: jest.fn((data: Record<string, any>) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
      remove: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    lastError: undefined,
  },
};

describe('auth-storage', () => {
  const mockUser: TalkientUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  };

  const mockAuthState: AuthState = {
    isAuthenticated: true,
    user: mockUser,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + 3600 * 1000,
  };

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  describe('getAuthState', () => {
    it('should return default auth state when storage is empty', async () => {
      const state = await getAuthState();

      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });

    it('should return stored auth state', async () => {
      mockStorage['talkient_auth_state'] = mockAuthState;

      const state = await getAuthState();

      expect(state).toEqual(mockAuthState);
    });

    it('should return default state on storage error', async () => {
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

    it('should return malformed stored state as-is when storage contains an unexpected shape', async () => {
      const malformedState = { isAuthenticated: true };
      mockStorage['talkient_auth_state'] = malformedState;

      const state = await getAuthState();

      expect(state).toEqual(malformedState);
    });
  });

  describe('saveAuthState', () => {
    it('should save auth state to storage', async () => {
      await saveAuthState(mockAuthState);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        talkient_auth_state: mockAuthState,
      });
    });

    it('should throw on storage error', async () => {
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      await expect(saveAuthState(mockAuthState)).rejects.toThrow(
        'Storage error',
      );
    });
  });

  describe('saveSession', () => {
    it('should save user with tokens and authenticated state', async () => {
      const expiresAt = Date.now() + 3600 * 1000;
      await saveSession(mockUser, 'access-token', 'refresh-token', expiresAt);

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
    it('should remove auth state from storage', async () => {
      await clearAuthState();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        'talkient_auth_state',
      );
    });

    it('should throw on storage error', async () => {
      (chrome.storage.local.remove as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      await expect(clearAuthState()).rejects.toThrow('Storage error');
    });
  });

  describe('getStoredUser', () => {
    it('should return null when no user is stored', async () => {
      const user = await getStoredUser();

      expect(user).toBeNull();
    });

    it('should return stored TalkientUser', async () => {
      mockStorage['talkient_auth_state'] = mockAuthState;

      const user = await getStoredUser();

      expect(user).toEqual(mockUser);
    });
  });

  describe('isStoredAuthenticated', () => {
    it('should return false when not authenticated', async () => {
      const result = await isStoredAuthenticated();

      expect(result).toBe(false);
    });

    it('should return true when authenticated', async () => {
      mockStorage['talkient_auth_state'] = mockAuthState;

      const result = await isStoredAuthenticated();

      expect(result).toBe(true);
    });
  });
});
