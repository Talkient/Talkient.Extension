export interface TalkientUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: TalkientUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface AuthResult {
  success: boolean;
  user?: TalkientUser;
  error?: string;
}

export interface TalkientTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
