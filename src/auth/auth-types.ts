/**
 * User information retrieved from Google OAuth
 */
export interface GoogleUser {
  /** Unique Google user ID */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** URL to user's profile picture */
  picture: string;
  /** Whether the email is verified */
  verified_email: boolean;
}

/**
 * Authentication state stored locally
 */
export interface AuthState {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Cached user information (null if not authenticated) */
  user: GoogleUser | null;
  /** Timestamp when the auth state was last updated */
  lastUpdated: number;
}

/**
 * Result of an authentication operation
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean;
  /** User info if successful */
  user?: GoogleUser;
  /** Error message if failed */
  error?: string;
}

/**
 * Google OAuth token info response
 */
export interface GoogleTokenInfo {
  issued_to: string;
  audience: string;
  user_id: string;
  scope: string;
  expires_in: number;
  email: string;
  verified_email: boolean;
  access_type: string;
}

/**
 * Google UserInfo API response
 */
export interface GoogleUserInfoResponse {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}
