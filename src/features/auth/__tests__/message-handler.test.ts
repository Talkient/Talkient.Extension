import {
  handleGetAuthState,
  handleSignIn,
  handleSignOut,
} from '../background/message-handler';
import type { TalkientUser } from '../types';

jest.mock('../background/auth-service', () => ({
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));

import * as authService from '../background/auth-service';

const mockUser: TalkientUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
};

describe('auth message-handler', () => {
  let sendResponse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    sendResponse = jest.fn();
  });

  describe('handleSignIn', () => {
    it('should respond with the authenticated user on success', async () => {
      (authService.signInWithGoogle as jest.Mock).mockResolvedValueOnce({
        success: true,
        user: mockUser,
      });

      await handleSignIn(true, sendResponse);

      expect(authService.signInWithGoogle).toHaveBeenCalledWith(true);
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });

    it('should respond with the auth error on failure', async () => {
      (authService.signInWithGoogle as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'popup-blocked',
      });

      await handleSignIn(false, sendResponse);

      expect(authService.signInWithGoogle).toHaveBeenCalledWith(false);
      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'popup-blocked',
      });
    });
  });

  describe('handleSignOut', () => {
    it('should forward the sign-out result', async () => {
      (authService.signOut as jest.Mock).mockResolvedValueOnce({
        success: true,
      });

      await handleSignOut(sendResponse);

      expect(authService.signOut).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('handleGetAuthState', () => {
    it('should respond with an authenticated state when a user exists', async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValueOnce(mockUser);

      await handleGetAuthState(sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        isAuthenticated: true,
        user: mockUser,
      });
    });

    it('should respond with a signed-out state when no user exists', async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      await handleGetAuthState(sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        isAuthenticated: false,
        user: null,
      });
    });

    it('should serialize thrown errors', async () => {
      (authService.getCurrentUser as jest.Mock).mockRejectedValueOnce(
        new Error('background unavailable'),
      );

      await handleGetAuthState(sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'background unavailable',
      });
    });
  });
});
