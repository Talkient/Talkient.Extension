/// <reference types="chrome" />

import type { StorageSchema } from '../../features/settings/storage-schema';
import { DEFAULT_SETTINGS } from '../../features/settings/storage-schema';
import type { Callback } from '../types/common';

/**
 * Type-safe wrapper for chrome.storage.local with caching support
 */
class StorageManager {
  private cache = new Map<keyof StorageSchema, unknown>();

  /**
   * Get a value from storage with type safety
   * @param key - The storage key
   * @returns Promise resolving to the stored value or default
   */
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as StorageSchema[K];
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const value =
          result[key] !== undefined
            ? (result[key] as StorageSchema[K])
            : DEFAULT_SETTINGS[key];

        this.cache.set(key, value);
        resolve(value);
      });
    });
  }

  /**
   * Get multiple values from storage at once
   * @param keys - Array of storage keys
   * @returns Promise resolving to partial storage object
   */
  async getMultiple<K extends keyof StorageSchema>(
    keys: K[],
  ): Promise<Pick<StorageSchema, K>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        const values = {} as Pick<StorageSchema, K>;

        for (const key of keys) {
          const value =
            result[key] !== undefined
              ? (result[key] as StorageSchema[K])
              : DEFAULT_SETTINGS[key];
          values[key] = value;
          this.cache.set(key, value);
        }

        resolve(values);
      });
    });
  }

  /**
   * Set a value in storage with type safety
   * @param key - The storage key
   * @param value - The value to store
   * @returns Promise resolving when storage is complete
   */
  async set<K extends keyof StorageSchema>(
    key: K,
    value: StorageSchema[K],
  ): Promise<void> {
    this.cache.set(key, value);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            `[Talkient.Storage] Error setting ${String(key)}:`,
            chrome.runtime.lastError,
          );
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Set multiple values in storage at once
   * @param values - Object with key-value pairs to store
   * @returns Promise resolving when storage is complete
   */
  async setMultiple(values: Partial<StorageSchema>): Promise<void> {
    // Update cache
    for (const [key, value] of Object.entries(values)) {
      this.cache.set(key as keyof StorageSchema, value);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        if (chrome.runtime.lastError) {
          console.error(
            '[Talkient.Storage] Error setting multiple values:',
            chrome.runtime.lastError,
          );
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Subscribe to changes for a specific storage key
   * @param key - The storage key to watch
   * @param callback - Function called when the value changes
   */
  subscribe<K extends keyof StorageSchema>(
    key: K,
    callback: Callback<StorageSchema[K]>,
  ): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[key]) {
        const newValue = changes[key].newValue as StorageSchema[K];
        this.cache.set(key, newValue);
        callback(newValue);
      }
    });
  }

  /**
   * Clear a specific key from cache (forces reload from storage on next get)
   * @param key - The storage key to clear from cache
   */
  clearCache(key: keyof StorageSchema): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values (forces reload from storage on next get)
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance of StorageManager
 * Use this to access chrome.storage.local in a type-safe way
 *
 * @example
 * // Get a single value
 * const rate = await storage.get('speechRate');
 *
 * // Set a single value
 * await storage.set('speechRate', 1.5);
 *
 * // Get multiple values
 * const { speechRate, speechPitch } = await storage.getMultiple(['speechRate', 'speechPitch']);
 *
 * // Subscribe to changes
 * storage.subscribe('speechRate', (newRate) => {
 *   console.log('Speech rate changed to:', newRate);
 * });
 */
export const storage = new StorageManager();
