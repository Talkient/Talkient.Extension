/**
 * Common utility types used across the extension
 */

/**
 * Make all properties in T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract keys from T that have values of type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Callback function type
 */
export type Callback<T = void> = (value: T) => void;

/**
 * Async callback function type
 */
export type AsyncCallback<T = void> = (value: T) => Promise<void>;
