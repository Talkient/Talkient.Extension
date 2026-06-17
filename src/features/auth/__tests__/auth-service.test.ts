/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAccessToken,
  getCurrentUser,
  isAuthenticated,
  signInWithGoogle,
  signOut,
} from '../background/auth-service';

jest.mock('../background/auth-storage', () => ({
  clearAuthState: jest.fn(),
  getAuthState: jest.fn(),
  saveAuthenticatedSession: jest.fn(),
}));

import * as authStorage from '../background/auth-storage';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

(global as any).chrome = {
  identity: {
    getRedirectURL: jest.fn(() => 'https://extension-id.chromiumapp.org/'),
    launchWebAuthFlow: jest.fn(),
  },
  runtime: {
    lastError: undefined as chrome.runtime.LastError | undefined,
  },
};

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('auth-service', () => {
  const accessToken = makeJwt({
    sub: 'user-123',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    picture: 'https://example.com/ada.png',
  });

  const refreshedAccessToken = makeJwt({
    sub: 'user-123',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    picture: 'https://example.com/new-ada.png',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.runtime.lastError as any) = undefined;
  });

  describe('signInWithGoogle', () => {
    it('signs in via launchWebAuthFlow and stores Talkient tokens', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_details: unknown, callback: (responseUrl?: string) => void) => {
          callback('https://extension-id.chromiumapp.org/?code=oauth-code-123');
        },
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken,
            refreshToken: 'refresh-123',
            expiresIn: 1800,
          }),
      });

      const result = await signInWithGoogle(true);

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          interactive: true,
        }),
        expect.any(Function),
      );
      const [exchangeUrl, exchangeOptions] = mockFetch.mock.calls[0] as [
        URL | string,
        Record<string, unknown>,
      ];
      expect(String(exchangeUrl)).toContain(
        '/api/auth/google/extension-callback',
      );
      expect(exchangeOptions).toEqual(
        expect.objectContaining({ method: 'POST' }),
      );
      expect(authStorage.saveAuthenticatedSession).toHaveBeenCalledWith(
        {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          picture: 'https://example.com/ada.png',
        },
        accessToken,
        'refresh-123',
        expect.any(Number),
      );
      expect(result).toEqual({
        success: true,
        user: {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          picture: 'https://example.com/ada.png',
        },
      });
    });

    it('returns error when OAuth callback does not include code', async () => {
      (chrome.identity.launchWebAuthFlow as jest.Mock).mockImplementation(
        (_details: unknown, callback: (responseUrl?: string) => void) => {
          callback('https://extension-id.chromiumapp.org/');
        },
      );

      const result = await signInWithGoogle(true);

      expect(result).toEqual({
        success: false,
        error: 'Authorization code not returned by OAuth flow',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('automatic refresh', () => {
    it('refreshes token before API use when expired', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValueOnce({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
        },
        accessToken,
        refreshToken: 'refresh-123',
        expiresAt: Date.now() - 10_000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            accessToken: refreshedAccessToken,
            refreshToken: 'refresh-456',
            expiresIn: 1800,
          }),
      });

      const token = await getAccessToken();

      const [refreshUrl, refreshOptions] = mockFetch.mock.calls[0] as [
        URL | string,
        Record<string, unknown>,
      ];
      expect(String(refreshUrl)).toContain('/api/auth/refresh');
      expect(refreshOptions).toEqual(
        expect.objectContaining({ method: 'POST' }),
      );
      expect(authStorage.saveAuthenticatedSession).toHaveBeenCalledWith(
        {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          picture: 'https://example.com/new-ada.png',
        },
        refreshedAccessToken,
        'refresh-456',
        expect.any(Number),
      );
      expect(token).toBe(refreshedAccessToken);
    });

    it('clears auth state when refresh fails', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValue({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
        },
        accessToken,
        refreshToken: 'refresh-123',
        expiresAt: Date.now() - 10_000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const user = await getCurrentUser();
      const authenticated = await isAuthenticated();

      expect(authStorage.clearAuthState).toHaveBeenCalled();
      expect(user).toBeNull();
      expect(authenticated).toBe(false);
    });
  });

  describe('signOut', () => {
    it('calls logout endpoint and clears local auth state', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValueOnce({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
        },
        accessToken,
        refreshToken: 'refresh-123',
        expiresAt: Date.now() + 10_000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await signOut();

      const [logoutUrl, logoutOptions] = mockFetch.mock.calls[0] as [
        URL | string,
        Record<string, unknown>,
      ];
      expect(String(logoutUrl)).toContain('/api/auth/logout');
      expect(logoutOptions).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        }),
      );
      expect(authStorage.clearAuthState).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('still clears local auth state when logout fails', async () => {
      (authStorage.getAuthState as jest.Mock).mockResolvedValueOnce({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
        },
        accessToken,
        refreshToken: 'refresh-123',
        expiresAt: Date.now() + 10_000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await signOut();

      expect(authStorage.clearAuthState).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Logout failed with status 500',
      });
    });
  });
});
