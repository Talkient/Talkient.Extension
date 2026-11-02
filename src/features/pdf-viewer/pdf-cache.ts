/// <reference types="chrome" />

/**
 * Hands PDF bytes from the content script (which can fetch the document with
 * the site's cookies) to the extension viewer page through
 * chrome.storage.local. Entries expire after a few minutes and are removed
 * as soon as the viewer reads them.
 */

export const PDF_CACHE_KEY_PREFIX = 'talkientPdfCache:';
export const PDF_CACHE_INDEX_KEY = 'talkientPdfCacheIndex';
export const PDF_CACHE_TTL_MS = 5 * 60 * 1000;

interface PdfCacheEntry {
  data: string;
  ts: number;
}

type PdfCacheIndex = Record<string, number>;

const BASE64_CHUNK_SIZE = 0x8000;

export function getPdfCacheKey(url: string): string {
  return PDF_CACHE_KEY_PREFIX + url;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + BASE64_CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isCacheIndex(value: unknown): value is PdfCacheIndex {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCacheEntry(value: unknown): value is PdfCacheEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PdfCacheEntry).data === 'string' &&
    typeof (value as PdfCacheEntry).ts === 'number'
  );
}

async function readIndex(): Promise<PdfCacheIndex> {
  const result = await chrome.storage.local.get([PDF_CACHE_INDEX_KEY]);
  const index: unknown = result[PDF_CACHE_INDEX_KEY];
  return isCacheIndex(index) ? { ...index } : {};
}

function expiredKeys(index: PdfCacheIndex, now: number): string[] {
  return Object.keys(index).filter(
    (key) => now - index[key] > PDF_CACHE_TTL_MS,
  );
}

export async function storePdfBytes(
  url: string,
  bytes: ArrayBuffer,
  now: number = Date.now(),
): Promise<void> {
  const key = getPdfCacheKey(url);
  const index = await readIndex();
  const staleKeys = expiredKeys(index, now).filter((stale) => stale !== key);

  staleKeys.forEach((stale) => delete index[stale]);
  if (staleKeys.length > 0) {
    await chrome.storage.local.remove(staleKeys);
  }

  index[key] = now;
  const entry: PdfCacheEntry = {
    data: bytesToBase64(new Uint8Array(bytes)),
    ts: now,
  };
  await chrome.storage.local.set({
    [key]: entry,
    [PDF_CACHE_INDEX_KEY]: index,
  });
}

/**
 * Reads and deletes the cached bytes for `url`. Returns null when there is no
 * entry or it already expired. Other expired entries are cleaned up too.
 */
export async function takePdfBytes(
  url: string,
  now: number = Date.now(),
): Promise<ArrayBuffer | null> {
  const key = getPdfCacheKey(url);
  const result = await chrome.storage.local.get([key, PDF_CACHE_INDEX_KEY]);
  const entry: unknown = result[key];
  const rawIndex: unknown = result[PDF_CACHE_INDEX_KEY];
  const index: PdfCacheIndex = isCacheIndex(rawIndex) ? { ...rawIndex } : {};

  const keysToRemove = [key, ...expiredKeys(index, now)];
  keysToRemove.forEach((removed) => delete index[removed]);
  await chrome.storage.local.remove(keysToRemove);
  await chrome.storage.local.set({ [PDF_CACHE_INDEX_KEY]: index });

  if (!isCacheEntry(entry) || now - entry.ts > PDF_CACHE_TTL_MS) {
    return null;
  }

  const bytes = base64ToBytes(entry.data);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
