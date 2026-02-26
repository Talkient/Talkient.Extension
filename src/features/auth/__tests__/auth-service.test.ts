/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  isAuthenticated,
} from '../background/auth-service';
import type { GoogleUser } from '../types';

// Mock storage functions
jest.mock('../background/auth-storage', () => ({
  getStoredUser: jest.fn(),
  isStoredAuthenticated: jest.fn(),
  saveUser: jest.fn(),
  clearAuthState: jest.fn(),
}));

import * as authStorage from '../background/auth-storage';

const mockUser: GoogleUser = {
  id: '123456789',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  verified_email: true,
};

// Mock Chrome identity API
(global as any).chrome = {
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn(),
  },
  runtime: {
    lastError: undefined as chrome.runtime.LastError | undefined,
  },
};

// Mock fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('auth-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.runtime.lastError as any) = undefined;
  });

  describe('signInWithGoogle', () => {
    it('should successfully sign in with Google', async () => {
      // Mock getAuthToken to return a token
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback('mock-token-123');
        },
      );

      // Mock fetch to return user info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            picture: mockUser.picture,
            verified_email: mockUser.verified_email,
          }),
      });

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(authStorage.saveUser).toHaveBeenCalledWith(mockUser);
      expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: true },
        expect.any(Function),
      );
    });

    it('should fail when getAuthToken fails', async () => {
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          (chrome.runtime.lastError as any) = { message: 'User cancelled' };
          callback(undefined);
        },
      );

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get authentication token');
    });

    it('should fail when user info fetch fails', async () => {
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback('mock-token-123');
        },
      );

      (chrome.identity.removeCachedAuthToken as jest.Mock).mockImplementation(
        (_details: any, callback: () => void) => {
          callback();
        },
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch user profile');
      expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token: 'mock-token-123' },
        expect.any(Function),
      );
    });

    it('should use interactive: false for silent auth', async () => {
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback(undefined);
        },
      );

      await signInWithGoogle(false);

      expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: false },
        expect.any(Function),
      );
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback('mock-token-123');
        },
      );

      (chrome.identity.removeCachedAuthToken as jest.Mock).mockImplementation(
        (_details: any, callback: () => void) => {
          callback();
        },
      );

      // Mock token revocation
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(authStorage.clearAuthState).toHaveBeenCalled();
      expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalled();
    });

    it('should still clear local state even if token revocation fails', async () => {
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback('mock-token-123');
        },
      );

      (chrome.identity.removeCachedAuthToken as jest.Mock).mockImplementation(
        (_details: any, callback: () => void) => {
          callback();
        },
      );

      // Mock token revocation failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await signOut();

      // Should still be successful since local state is cleared
      expect(result.success).toBe(true);
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });

    it('should handle sign out when no token exists', async () => {
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback(undefined);
        },
      );

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return stored user if available', async () => {
      (authStorage.getStoredUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should try silent auth if no stored user', async () => {
      (authStorage.getStoredUser as jest.Mock).mockResolvedValueOnce(null);

      // Mock silent auth failure
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback(undefined);
        },
      );

      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: false },
        expect.any(Function),
      );
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when stored authenticated and token valid', async () => {
      (authStorage.isStoredAuthenticated as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback('valid-token');
        },
      );

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when stored authenticated but token invalid', async () => {
      (authStorage.isStoredAuthenticated as jest.Mock).mockResolvedValueOnce(
        true,
      );
      (chrome.identity.getAuthToken as jest.Mock).mockImplementation(
        (_options: any, callback: (token?: string) => void) => {
          callback(undefined);
        },
      );

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false when not stored authenticated', async () => {
      (authStorage.isStoredAuthenticated as jest.Mock).mockResolvedValueOnce(
        false,
      );

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
