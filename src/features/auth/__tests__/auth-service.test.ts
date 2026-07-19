/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  refreshSession,
} from '../background/auth-service';
import type { TalkientUser, AuthState } from '../types';

jest.mock('../background/auth-storage', () => ({
  getAuthState: jest.fn(),
  saveSession: jest.fn(),
  clearAuthState: jest.fn(),
}));

import * as authStorage from '../background/auth-storage';

const MOCK_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  btoa(
    JSON.stringify({
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '') +
  '.signature';

const MOCK_REFRESH_TOKEN = 'mock-refresh-token';
const MOCK_EXPIRES_IN = 1800;

const mockUser: TalkientUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
};

const unauthenticatedState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

const authenticatedState: AuthState = {
  isAuthenticated: true,
  user: mockUser,
  accessToken: MOCK_ACCESS_TOKEN,
  refreshToken: MOCK_REFRESH_TOKEN,
  expiresAt: Date.now() + 3600 * 1000,
};

(global as any).chrome = {
  identity: {
    launchWebAuthFlow: jest.fn(),
    getRedirectURL: jest.fn(() => 'https://test-id.chromiumapp.org/'),
  },
  storage: {
    local: {
      get: jest.fn(async () => ({})),
    },
  },
  runtime: {
    getManifest: jest.fn(() => ({
      host_permissions: ['https://api.talkient.app/*'],
    })),
    lastError: undefined as chrome.runtime.LastError | undefined,
  },
};

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

function mockTokenResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        expiresIn: MOCK_EXPIRES_IN,
      }),
  });
}

describe('auth-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.runtime.lastError as any) = undefined;
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
    (chrome.runtime.getManifest as jest.Mock).mockReturnValue({
      host_permissions: ['https://api.talkient.app/*'],
    });
    (authStorage.getAuthState as jest.Mock).mockResolvedValue(
      unauthenticatedState,
    );
    (authStorage.saveSession as jest.Mock).mockResolvedValue(undefined);
    (authStorage.clearAuthState as jest.Mock).mockResolvedValue(undefined);
  });

  describe('signInWithGoogle', () => {
    it('should complete full sign-in flow via launchWebAuthFlow', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback(
            'https://test-id.chromiumapp.org/?code=auth-code-123&state=abc',
          );
        },
      );
      mockTokenResponse();

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/api/auth/google?redirect_uri='),
          interactive: true,
        }),
        expect.any(Function),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/google/extension-callback'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ code: 'auth-code-123' }),
        }),
      );
      expect(authStorage.saveSession).toHaveBeenCalledWith(
        mockUser,
        MOCK_ACCESS_TOKEN,
        MOCK_REFRESH_TOKEN,
        expect.any(Number),
      );
    });

    it('should use the stored API base URL override when present', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        talkient_api_base_url: 'http://localhost:5000',
      });
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback(
            'https://test-id.chromiumapp.org/?code=auth-code-123&state=abc',
          );
        },
      );
      mockTokenResponse();

      await signInWithGoogle(true);

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(
            'http://localhost:5000/api/auth/google?redirect_uri=',
          ),
        }),
        expect.any(Function),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'http://localhost:5000/api/auth/google/extension-callback',
        ),
        expect.any(Object),
      );
    });

    it('should default to localhost when loopback host permissions are present', async () => {
      (chrome.runtime.getManifest as jest.Mock).mockReturnValue({
        host_permissions: [
          'http://localhost:*/*',
          'http://127.0.0.1:*/*',
          'https://api.talkient.app/*',
        ],
      });
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback(
            'https://test-id.chromiumapp.org/?code=auth-code-123&state=abc',
          );
        },
      );
      mockTokenResponse();

      await signInWithGoogle(true);

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining(
            'http://localhost:5000/api/auth/google?redirect_uri=',
          ),
        }),
        expect.any(Function),
      );
    });

    it('should use interactive: false for silent auth', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback('https://test-id.chromiumapp.org/?code=auth-code-123');
        },
      );
      mockTokenResponse();

      await signInWithGoogle(false);

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({ interactive: false }),
        expect.any(Function),
      );
    });

    it('should fail when launchWebAuthFlow returns no URL', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback(undefined);
        },
      );

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail when launchWebAuthFlow sets a runtime error', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          (chrome.runtime.lastError as any) = { message: 'User cancelled' };
          callback(undefined);
        },
      );

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled');
    });

    it('should fail when redirect URL has no code', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback('https://test-id.chromiumapp.org/?error=access_denied');
        },
      );

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('access_denied');
    });

    it('should fail when extension-callback API returns non-OK', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback('https://test-id.chromiumapp.org/?code=auth-code-123');
        },
      );
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to exchange authorization code');
    });

    it('should fail when extension-callback API throws', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_options: any, callback: (url?: string) => void) => {
          callback('https://test-id.chromiumapp.org/?code=auth-code-123');
        },
      );
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await signInWithGoogle(true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('refreshSession', () => {
    it('should refresh using cookie (empty body) and update stored session', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        unauthenticatedState,
      );
      mockTokenResponse();

      const result = await refreshSession();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
      expect(authStorage.saveSession).toHaveBeenCalledWith(
        mockUser,
        MOCK_ACCESS_TOKEN,
        MOCK_REFRESH_TOKEN,
        expect.any(Number),
      );
    });

    it('should include stored refresh token in request body when available', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue({
        ...authenticatedState,
        refreshToken: 'stored-refresh-token',
      });
      mockTokenResponse();

      await refreshSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('stored-refresh-token'),
        }),
      );
    });

    it('should send empty body when no refresh token is stored', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        unauthenticatedState,
      );
      mockTokenResponse();

      await refreshSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({}),
        }),
      );
    });

    it('should clear auth state on 401 and return failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await refreshSession();

      expect(result.success).toBe(false);
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });

    it('should NOT clear auth state on transient server error (5xx)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

      const result = await refreshSession();

      expect(result.success).toBe(false);
      expect(authStorage.clearAuthState).not.toHaveBeenCalled();
    });

    it('should fail when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));

      const result = await refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network unavailable');
    });
  });

  describe('signOut', () => {
    it('should call logout API with access token and clear state', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        authenticatedState,
      );
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            Authorization: `Bearer ${MOCK_ACCESS_TOKEN}`,
          }),
        }),
      );
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });

    it('should still clear state even if logout API fails', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        authenticatedState,
      );
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });

    it('should skip API call when no access token is stored', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        unauthenticatedState,
      );

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });

    it('should clear state and return error when fetch throws', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        authenticatedState,
      );
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(authStorage.clearAuthState).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return stored user when access token is still valid', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        authenticatedState,
      );

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should attempt refresh when token is expired', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue({
        ...authenticatedState,
        expiresAt: Date.now() - 1000,
      });
      mockTokenResponse();

      const user = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.any(Object),
      );
      expect(user).toEqual(mockUser);
    });

    it('should attempt refresh when no token is stored (cross-app session sync)', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        unauthenticatedState,
      );
      mockTokenResponse();

      const user = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.any(Object),
      );
      expect(user).toEqual(mockUser);
    });

    it('should return null when refresh fails', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue(
        unauthenticatedState,
      );
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
