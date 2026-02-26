/// <reference types="chrome" />

import { DEFAULT_SETTINGS } from '../storage-schema';
import type { StorageSchema } from '../storage-schema';

/**
 * Initializes missing settings in storage with their default values.
 * Should be called on service worker startup to ensure all settings exist.
 */
export function initializeSettings(): Promise<void> {
  return new Promise((resolve) => {
    const keys = Object.keys(DEFAULT_SETTINGS) as (keyof StorageSchema)[];
    chrome.storage.local.get(keys, (result) => {
      const missing: Partial<StorageSchema> = {};
      for (const key of keys) {
        if (result[key] === undefined) {
          (missing as Record<string, unknown>)[key] = DEFAULT_SETTINGS[key];
        }
      }
      if (Object.keys(missing).length > 0) {
        chrome.storage.local.set(missing, resolve);
      } else {
        resolve();
      }
    });
  });
}
