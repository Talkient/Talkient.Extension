/// <reference types="chrome" />

import type {
  ServiceWorkerMessage,
  MessageResponse,
  ExtendedServiceWorkerMessage,
} from '../types/messages';

/**
 * Checks if the Chrome extension runtime is still valid
 * @returns true if the runtime is valid, false otherwise
 */
export function isExtensionContextValid(): boolean {
  try {
    // Try to access chrome.runtime.id
    // If the extension context is invalidated, this will throw an error or return undefined
    return !!chrome.runtime?.id;
  } catch (error) {
    console.warn('[Talkient] Extension context is no longer valid:', error);
    return false;
  }
}

/**
 * Safely sends a message to the background script, checking for context validity first
 * @param message - The message to send
 * @param callback - Optional callback to handle the response
 * @returns true if the message was sent, false if the context is invalid
 */
export function safeSendMessage(
  message: ServiceWorkerMessage | ExtendedServiceWorkerMessage,
  callback?: (response: MessageResponse | undefined) => void,
): boolean {
  if (!isExtensionContextValid()) {
    console.warn(
      '[Talkient] Cannot send message - extension context is invalidated. The extension may have been reloaded.',
    );
    return false;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Check if it's a context invalidation error
        const errorMessage = chrome.runtime.lastError.message || '';
        if (
          errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('message port closed')
        ) {
          console.warn(
            '[Talkient] Extension context was invalidated during message send. This usually happens when the extension is reloaded.',
          );
        } else {
          console.error(
            '[Talkient] Error sending message:',
            chrome.runtime.lastError,
          );
        }
      } else if (callback) {
        callback(response as MessageResponse | undefined);
      }
    });
    return true;
  } catch (error) {
    console.error('[Talkient] Failed to send message:', error);
    return false;
  }
}

/**
 * Send a message and wait for response with Promise
 * @param message - The message to send
 * @returns Promise resolving to the response
 */
export async function sendMessageAsync(
  message: ServiceWorkerMessage | ExtendedServiceWorkerMessage,
): Promise<MessageResponse | undefined> {
  return new Promise((resolve) => {
    safeSendMessage(message, (response) => {
      resolve(response);
    });
  });
}
