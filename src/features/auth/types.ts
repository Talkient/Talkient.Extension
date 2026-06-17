/**
 * Authenticated user resolved by Talkient API / JWT claims
 */
export interface TalkientUser {
  /** Talkient user identifier (JWT "sub" claim) */
  id: string;
  /** User email (JWT "email" claim) */
  email: string;
  /** User display name (JWT "name" claim) */
  name: string;
  /** Optional profile image URL (JWT "picture" claim) */
  picture?: string;
}

/**
 * Authentication state stored locally
 */
export interface AuthState {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Cached user information (null if not authenticated) */
  user: TalkientUser | null;
  /** JWT access token for authenticated API calls */
  accessToken: string | null;
  /** Refresh token used to renew access token */
  refreshToken: string | null;
  /** Access token expiration timestamp (epoch milliseconds) */
  expiresAt: number | null;
}

/**
 * Result of an authentication operation
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean;
  /** User info when successful */
  user?: TalkientUser;
  /** Error message when failed */
  error?: string;
}

/**
 * Authentication payload returned by Talkient API
 */
export interface TalkientAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
