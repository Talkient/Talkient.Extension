// Auth response types are imported but used via 'any' type for now
// Will be properly typed when auth feature is extracted in Phase 5

console.log('Popup for Talkient Extension');

// DOM elements
let userProfileEl: HTMLElement | null;
let userAvatarEl: HTMLImageElement | null;
let userNameEl: HTMLElement | null;
let userEmailEl: HTMLElement | null;
let signInBtnEl: HTMLButtonElement | null;
let signOutBtnEl: HTMLButtonElement | null;
let authLoadingEl: HTMLElement | null;

/**
 * Initialize DOM element references
 */
function initDomElements(): void {
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

// Add event listener for the "Go to my settings" link
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM references
  initDomElements();

  // Check authentication state
  void checkAuthState();

  // Set up auth button handlers
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

  const optionsLink = document.getElementById('options-link');
  const reportIssueLink = document.getElementById('report-issue-link');

  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the options page
      void chrome.runtime.openOptionsPage();
    });
  }

  if (reportIssueLink) {
    reportIssueLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the GitHub issues page in a new tab
      void chrome.tabs.create({
        url: 'https://github.com/Talkient/talkient-public/issues/new',
      });
    });
  }
});
