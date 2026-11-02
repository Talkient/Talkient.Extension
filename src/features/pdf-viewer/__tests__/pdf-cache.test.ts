/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PDF_CACHE_INDEX_KEY,
  PDF_CACHE_TTL_MS,
  base64ToBytes,
  bytesToBase64,
  getPdfCacheKey,
  storePdfBytes,
  takePdfBytes,
} from '../pdf-cache';

const URL_A = 'https://example.com/a.pdf';
const URL_B = 'https://example.com/b.pdf';

let storage: Record<string, unknown>;

beforeEach(() => {
  storage = {};
  (global as any).chrome.storage = {
    local: {
      get: jest.fn(async (keys: string[]) => {
        const result: Record<string, unknown> = {};
        keys.forEach((key) => {
          if (key in storage) result[key] = storage[key];
        });
        return result;
      }),
      set: jest.fn(async (items: Record<string, unknown>) => {
        Object.assign(storage, items);
      }),
      remove: jest.fn(async (keys: string[]) => {
        keys.forEach((key) => delete storage[key]);
      }),
    },
  };
});

function toBuffer(values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

describe('base64 helpers', () => {
  it('round trips binary data', () => {
    const bytes = new Uint8Array(70000).map((_, index) => index % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('PDF redirect cache', () => {
  it('stores the bytes and gives them back once', async () => {
    await storePdfBytes(URL_A, toBuffer([37, 80, 68, 70]), 1000);

    expect(storage[PDF_CACHE_INDEX_KEY]).toEqual({
      [getPdfCacheKey(URL_A)]: 1000,
    });

    const bytes = await takePdfBytes(URL_A, 2000);
    expect(bytes && Array.from(new Uint8Array(bytes))).toEqual([
      37, 80, 68, 70,
    ]);

    // Deleted on read
    expect(storage[getPdfCacheKey(URL_A)]).toBeUndefined();
    expect(storage[PDF_CACHE_INDEX_KEY]).toEqual({});
    expect(await takePdfBytes(URL_A, 3000)).toBeNull();
  });

  it('ignores and removes expired entries', async () => {
    await storePdfBytes(URL_A, toBuffer([1]), 1000);

    expect(await takePdfBytes(URL_A, 1000 + PDF_CACHE_TTL_MS + 1)).toBeNull();
    expect(storage[getPdfCacheKey(URL_A)]).toBeUndefined();
  });

  it('prunes other expired entries when writing', async () => {
    await storePdfBytes(URL_A, toBuffer([1]), 1000);
    await storePdfBytes(URL_B, toBuffer([2]), 1000 + PDF_CACHE_TTL_MS + 1);

    expect(storage[getPdfCacheKey(URL_A)]).toBeUndefined();
    expect(storage[getPdfCacheKey(URL_B)]).toBeDefined();
    expect(Object.keys(storage[PDF_CACHE_INDEX_KEY] as object)).toEqual([
      getPdfCacheKey(URL_B),
    ]);
  });

  it('prunes other expired entries when reading', async () => {
    await storePdfBytes(URL_A, toBuffer([1]), 1000);
    await storePdfBytes(URL_B, toBuffer([2]), PDF_CACHE_TTL_MS);

    await takePdfBytes(URL_B, PDF_CACHE_TTL_MS + 2000);

    expect(storage[getPdfCacheKey(URL_A)]).toBeUndefined();
    expect(storage[PDF_CACHE_INDEX_KEY]).toEqual({});
  });
});
