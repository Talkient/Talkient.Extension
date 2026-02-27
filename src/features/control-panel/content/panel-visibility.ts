/// <reference lib="dom" />
/// <reference types="chrome" />

/**
 * Panel Visibility Module
 * Handles cookie-based panel hiding and hide duration settings
 */

// Cookie name for hiding the control panel
const PANEL_HIDDEN_COOKIE_NAME = 'talkient_panel_hidden';

// Default duration to hide the panel in minutes
const DEFAULT_PANEL_HIDDEN_DURATION_MINUTES = 30;

// Cached duration value (updated from storage)
let cachedPanelHideDuration = DEFAULT_PANEL_HIDDEN_DURATION_MINUTES;

/**
 * Initializes the cached panel hide duration from storage
 * Should be called when the content script loads
 */
export function initPanelHideDuration(): void {
  chrome.storage.local.get(['panelHideDuration'], (result) => {
    if (typeof result.panelHideDuration === 'number') {
      cachedPanelHideDuration = result.panelHideDuration;
    }
  });

  // Listen for storage changes to keep cache in sync
  if (chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.panelHideDuration) {
        const newDuration = changes.panelHideDuration.newValue;
        if (typeof newDuration === 'number') {
          cachedPanelHideDuration = newDuration;
        }
      }
    });
  }
}

/**
 * Gets the current panel hide duration in minutes
 * @returns The duration in minutes (0-9999, default 30)
 */
export function getPanelHideDuration(): number {
  return cachedPanelHideDuration;
}

/**
 * Gets the cookie name used to track if the panel is hidden for this domain
 * @returns The cookie name
 */
export function getDomainHideCookieName(): string {
  return PANEL_HIDDEN_COOKIE_NAME;
}

/**
 * Checks if the control panel should be hidden for the current domain
 * @returns true if the panel should be hidden (cookie exists and is not expired)
 */
export function isPanelHiddenForDomain(): boolean {
  const cookieName = getDomainHideCookieName();
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName && value === 'true') {
      return true;
    }
  }

  return false;
}

/**
 * Sets a cookie to hide the control panel for the configured duration
 * The cookie will automatically expire after the duration
 * If duration is 0, no cookie is set (panel can always be closed but won't stay hidden)
 */
export function setDomainHideCookie(): void {
  const duration = getPanelHideDuration();

  // If duration is 0, don't set a cookie (panel won't stay hidden)
  if (duration === 0) {
    return;
  }

  const cookieName = getDomainHideCookieName();
  const expires = new Date(Date.now() + duration * 60 * 1000);
  document.cookie = `${cookieName}=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Clears the cookie that hides the control panel
 * This allows the panel to be shown again before the expiration time
 */
export function clearDomainHideCookie(): void {
  const cookieName = getDomainHideCookieName();
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}
