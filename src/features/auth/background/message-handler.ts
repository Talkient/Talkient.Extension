import { signInWithGoogle, signOut, getCurrentUser } from './auth-service';

export async function handleSignIn(
  interactive: boolean,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await signInWithGoogle(interactive);
  if (result.success) {
    sendResponse({ success: true, user: result.user });
  } else {
    sendResponse({ success: false, error: result.error });
  }
}

export async function handleSignOut(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const result = await signOut();
  sendResponse(result);
}

export async function handleGetAuthState(
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    const user = await getCurrentUser();
    const authenticated = !!user;
    sendResponse({ success: true, isAuthenticated: authenticated, user });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
