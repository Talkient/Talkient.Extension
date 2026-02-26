// Auth-specific DOM elements
let userProfileEl: HTMLElement | null = null;
let userAvatarEl: HTMLImageElement | null = null;
let userNameEl: HTMLElement | null = null;
let userEmailEl: HTMLElement | null = null;
let signInBtnEl: HTMLButtonElement | null = null;
let signOutBtnEl: HTMLButtonElement | null = null;
let authLoadingEl: HTMLElement | null = null;

/**
 * Initialize auth DOM element references
 */
function initAuthElements(): void {
  userProfileEl = document.getElementById('user-profile');
  userAvatarEl = document.getElementById('user-avatar') as HTMLImageElement;
  userNameEl = document.getElementById('user-name');
  userEmailEl = document.getElementById('user-email');
  signInBtnEl = document.getElementById('sign-in-btn') as HTMLButtonElement;
  signOutBtnEl = document.getElementById('sign-out-btn') as HTMLButtonElement;
  authLoadingEl = document.getElementById('auth-loading');
}

/**
 * Show/hide elements based on authentication state
 */
function updateAuthUI(
  isAuthenticated: boolean,
  user?: { name: string; email: string; picture: string },
): void {
  if (!userProfileEl || !signInBtnEl || !authLoadingEl) return;

  // Hide loading state
  authLoadingEl.classList.add('hidden');

  if (isAuthenticated && user) {
    // Show user profile
    userProfileEl.classList.remove('hidden');
    signInBtnEl.classList.add('hidden');

    // Update user info
    if (userAvatarEl) userAvatarEl.src = user.picture;
    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
  } else {
    // Show sign-in button
    userProfileEl.classList.add('hidden');
    signInBtnEl.classList.remove('hidden');
  }
}

/**
 * Show loading state during auth operations
 */
function showAuthLoading(): void {
  if (!userProfileEl || !signInBtnEl || !authLoadingEl) return;

  userProfileEl.classList.add('hidden');
  signInBtnEl.classList.add('hidden');
  authLoadingEl.classList.remove('hidden');
}

/**
 * Check current authentication state
 */
async function checkAuthState(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await chrome.runtime.sendMessage({
      type: 'GET_AUTH_STATE',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (response?.success) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      updateAuthUI(response.isAuthenticated, response.user ?? undefined);
    } else {
      updateAuthUI(false);
    }
  } catch (error) {
    console.error('[Talkient.Popup] Error checking auth state:', error);
    updateAuthUI(false);
  }
}

/**
 * Handle sign-in button click
 */
async function handleSignIn(): Promise<void> {
  showAuthLoading();

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await chrome.runtime.sendMessage({
      type: 'SIGN_IN',
      interactive: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (response?.success && 'user' in response) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      updateAuthUI(true, response.user);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('[Talkient.Popup] Sign-in failed:', response?.error);
      updateAuthUI(false);
    }
  } catch (error) {
    console.error('[Talkient.Popup] Sign-in error:', error);
    updateAuthUI(false);
  }
}

/**
 * Handle sign-out button click
 */
async function handleSignOut(): Promise<void> {
  showAuthLoading();

  try {
    await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
    updateAuthUI(false);
  } catch (error) {
    console.error('[Talkient.Popup] Sign-out error:', error);
    // Still update UI to signed-out state
    updateAuthUI(false);
  }
}

/**
 * Initialize auth UI: find elements, check state, and wire up button listeners
 */
export function initAuth(): void {
  initAuthElements();

  void checkAuthState();

  if (signInBtnEl) {
    signInBtnEl.addEventListener('click', () => {
      void handleSignIn();
    });
  }

  if (signOutBtnEl) {
    signOutBtnEl.addEventListener('click', () => {
      void handleSignOut();
    });
  }
}
