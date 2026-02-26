/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAuthState,
  saveAuthState,
  saveUser,
  clearAuthState,
  getStoredUser,
  isStoredAuthenticated,
} from '../background/auth-storage';
import type { AuthState, GoogleUser } from '../types';

// Mock Chrome storage API
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
  const mockUser: GoogleUser = {
    id: '123456789',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    verified_email: true,
  };

  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  describe('getAuthState', () => {
    it('should return default auth state when storage is empty', async () => {
      const state = await getAuthState();

      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        lastUpdated: 0,
      });
    });

    it('should return stored auth state', async () => {
      const storedState: AuthState = {
        isAuthenticated: true,
        user: mockUser,
        lastUpdated: Date.now(),
      };
      mockStorage['talkient_auth_state'] = storedState;

      const state = await getAuthState();

      expect(state).toEqual(storedState);
    });

    it('should return default state on storage error', async () => {
      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const state = await getAuthState();

      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        lastUpdated: 0,
      });
    });
  });

  describe('saveAuthState', () => {
    it('should save auth state to storage', async () => {
      const state: AuthState = {
        isAuthenticated: true,
        user: mockUser,
        lastUpdated: Date.now(),
      };

      await saveAuthState(state);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        talkient_auth_state: state,
      });
    });

    it('should throw on storage error', async () => {
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const state: AuthState = {
        isAuthenticated: true,
        user: mockUser,
        lastUpdated: Date.now(),
      };

      await expect(saveAuthState(state)).rejects.toThrow('Storage error');
    });
  });

  describe('saveUser', () => {
    it('should save user with authenticated state', async () => {
      const beforeTime = Date.now();
      await saveUser(mockUser);
      const afterTime = Date.now();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          talkient_auth_state: expect.objectContaining({
            isAuthenticated: true,
            user: mockUser,
          }),
        }),
      );

      // Verify lastUpdated is within the expected time range
      const savedState = (chrome.storage.local.set as jest.Mock).mock
        .calls[0][0]['talkient_auth_state'];
      expect(savedState.lastUpdated).toBeGreaterThanOrEqual(beforeTime);
      expect(savedState.lastUpdated).toBeLessThanOrEqual(afterTime);
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

    it('should return stored user', async () => {
      mockStorage['talkient_auth_state'] = {
        isAuthenticated: true,
        user: mockUser,
        lastUpdated: Date.now(),
      };

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
      mockStorage['talkient_auth_state'] = {
        isAuthenticated: true,
        user: mockUser,
        lastUpdated: Date.now(),
      };

      const result = await isStoredAuthenticated();

      expect(result).toBe(true);
    });
  });
});
