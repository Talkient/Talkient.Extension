/// <reference types="chrome" />

/**
 * Type-safe wrapper for chrome.tabs API
 */

/**
 * Get the currently active tab
 * @returns Promise resolving to the active tab
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

/**
 * Send a message to a specific tab
 * @param tabId - ID of the tab to send message to
 * @param message - Message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageToTab<T = unknown>(
  tabId: number,
  message: unknown,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          `[Talkient.Tabs] Error sending message to tab ${tabId}:`,
          chrome.runtime.lastError,
        );
        resolve(undefined);
      } else {
        resolve(response as T);
      }
    });
  });
}

/**
 * Create a new tab
 * @param url - URL to open
 * @param active - Whether to make the tab active
 * @returns Promise resolving to the created tab
 */
export async function createTab(
  url: string,
  active = true,
): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active }, (tab) => {
      resolve(tab);
    });
  });
}

/**
 * Open the extension options page
 */
export async function openOptionsPage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.openOptionsPage(() => {
      resolve();
    });
  });
}
