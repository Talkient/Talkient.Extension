import { test, expect } from './extension-test';
import type { BrowserContext, Page, Worker } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PDF_PATH = path.resolve(__dirname, 'test-pages/pdf-viewer-test.pdf');
const PDF_URL = 'https://talkient.test/docs/pdf-viewer-test.pdf';
const CACHE_KEY = `talkientPdfCache:${PDF_URL}`;

// Minimal chrome.tts shapes used inside the service worker
interface TtsEvent {
  type: string;
  charIndex?: number;
  length?: number;
}

interface TtsOptions {
  onEvent?: (event: TtsEvent) => void;
}

async function getServiceWorker(context: BrowserContext): Promise<Worker> {
  return (
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 10000 }))
  );
}

/**
 * Leaves the PDF in the redirect cache, like the launcher does, so the viewer
 * does not have to download it.
 */
async function seedPdfCache(page: Page, extensionId: string): Promise<void> {
  const base64 = fs.readFileSync(PDF_PATH).toString('base64');
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await page.evaluate(
    async ({ key, data }) => {
      const now = Date.now();
      await chrome.storage.local.set({
        [key]: { data, ts: now },
        talkientPdfCacheIndex: { [key]: now },
      });
    },
    { key: CACHE_KEY, data: base64 },
  );
}

async function openViewer(page: Page, extensionId: string): Promise<void> {
  await page.goto(
    `chrome-extension://${extensionId}/pdf-viewer/pdf-viewer.html?file=${encodeURIComponent(PDF_URL)}`,
  );
  await expect(page.locator('#tk-pdf-play')).toBeEnabled({ timeout: 15000 });
}

/**
 * Replaces chrome.tts in the service worker so speech is deterministic in
 * headless Chrome, and keeps the spoken texts and event callbacks.
 */
async function stubTts(serviceWorker: Worker): Promise<void> {
  await serviceWorker.evaluate(() => {
    const state = globalThis as unknown as {
      __spoken: string[];
      __ttsOptions: TtsOptions | null;
    };
    state.__spoken = [];
    state.__ttsOptions = null;
    const tts = chrome.tts as unknown as Record<string, unknown>;
    tts.getVoices = (callback: (voices: unknown[]) => void) =>
      callback([{ voiceName: 'Talkient Test', eventTypes: ['word', 'end'] }]);
    tts.speak = (text: string, options: TtsOptions) => {
      state.__spoken.push(text);
      state.__ttsOptions = options;
    };
    tts.stop = () => {};
    tts.pause = () => {};
    tts.resume = () => {};
  });
}

async function getSpoken(serviceWorker: Worker): Promise<string[]> {
  return serviceWorker.evaluate(
    () => (globalThis as unknown as { __spoken: string[] }).__spoken,
  );
}

async function emitTtsEvent(
  serviceWorker: Worker,
  event: TtsEvent,
): Promise<void> {
  await serviceWorker.evaluate((ttsEvent) => {
    const state = globalThis as unknown as {
      __ttsOptions: TtsOptions | null;
    };
    state.__ttsOptions?.onEvent?.(ttsEvent);
  }, event);
}

test.describe('PDF viewer', () => {
  test('renders the cached PDF with reading blocks over the text layer', async ({
    page,
    extensionId,
  }) => {
    await seedPdfCache(page, extensionId);
    await openViewer(page, extensionId);

    await expect(page.locator('#tk-pdf-title')).toHaveText(
      'pdf-viewer-test.pdf',
    );
    await expect(page.locator('.tk-pdf-page')).toHaveCount(2);
    await expect(
      page.locator('.tk-pdf-page[data-page-number="1"] canvas'),
    ).toHaveCount(1);
    await expect(
      page.locator('.tk-pdf-page[data-page-number="1"][data-mounted="true"]'),
    ).toHaveCount(1);

    // The first block is short and starts with the first line
    const firstBlock = page
      .locator('.tk-pdf-page[data-page-number="1"] .tk-pdf-block')
      .first();
    await expect(firstBlock).toContainText('Talkient PDF Viewer Test');
    // pdf.js text runs were moved inside the block
    expect(await firstBlock.locator('span').count()).toBeGreaterThan(0);

    // Lines joined with a space, so words never stick together
    const pageText = await page
      .locator('.tk-pdf-page[data-page-number="1"] .tk-pdf-block')
      .allTextContents();
    expect(pageText.join('')).toContain('Talkient reads PDF documents aloud.');

    // The viewer consumed the cached bytes
    const remaining = await page.evaluate(
      (key) => chrome.storage.local.get([key]),
      CACHE_KEY,
    );
    expect(remaining[CACHE_KEY]).toBeUndefined();
  });

  test('reads blocks aloud and highlights the spoken word', async ({
    page,
    context,
    extensionId,
  }) => {
    const serviceWorker = await getServiceWorker(context);
    await stubTts(serviceWorker);
    await seedPdfCache(page, extensionId);
    await openViewer(page, extensionId);
    await expect(
      page.locator('.tk-pdf-page[data-page-number="1"][data-mounted="true"]'),
    ).toHaveCount(1);

    await page.locator('#tk-pdf-play').click();
    await expect(page.locator('#tk-pdf-play')).toHaveAttribute(
      'data-status',
      'playing',
    );
    await expect.poll(() => getSpoken(serviceWorker)).toHaveLength(1);
    const [firstText] = await getSpoken(serviceWorker);
    expect(firstText.startsWith('Talkient PDF Viewer Test')).toBe(true);

    await expect(
      page.locator('[data-testid="pdf-sentence-highlight"]').first(),
    ).toBeVisible();

    // "PDF" in "Talkient PDF Viewer Test"
    await emitTtsEvent(serviceWorker, {
      type: 'word',
      charIndex: 9,
      length: 3,
    });
    const wordHighlight = page.locator('[data-testid="pdf-word-highlight"]');
    await expect(wordHighlight).toBeVisible();
    const box = await wordHighlight.boundingBox();
    expect(box?.width).toBeGreaterThan(0);

    // End of the block: the next block is read automatically
    await emitTtsEvent(serviceWorker, { type: 'end' });
    await expect.poll(() => getSpoken(serviceWorker)).toHaveLength(2);
    const spoken = await getSpoken(serviceWorker);
    expect(spoken[1]).not.toBe(spoken[0]);

    await page.locator('#tk-pdf-play').click();
    await expect(page.locator('#tk-pdf-play')).toHaveAttribute(
      'data-status',
      'paused',
    );
  });

  test('clicking a sentence starts reading from it', async ({
    page,
    context,
    extensionId,
  }) => {
    const serviceWorker = await getServiceWorker(context);
    await stubTts(serviceWorker);
    await seedPdfCache(page, extensionId);
    await openViewer(page, extensionId);

    const secondPage = page.locator('.tk-pdf-page[data-page-number="2"]');
    await secondPage.scrollIntoViewIfNeeded();
    await expect(
      page.locator('.tk-pdf-page[data-page-number="2"][data-mounted="true"]'),
    ).toHaveCount(1);

    // The whole line is one text run: click near its end, on the 2nd sentence
    const line = secondPage.locator('.tk-pdf-block span', {
      hasText: 'It has two sentences.',
    });
    const lineBox = await line.boundingBox();
    expect(lineBox).not.toBeNull();
    await line.click({
      position: { x: lineBox!.width - 20, y: lineBox!.height / 2 },
    });

    await expect.poll(() => getSpoken(serviceWorker)).toHaveLength(1);
    const [spoken] = await getSpoken(serviceWorker);
    expect(spoken.startsWith('It has two sentences.')).toBe(true);
  });

  test('shows an error for an unsupported file address', async ({
    page,
    extensionId,
  }) => {
    await page.goto(
      `chrome-extension://${extensionId}/pdf-viewer/pdf-viewer.html?file=${encodeURIComponent('javascript:alert(1)')}`,
    );
    await expect(page.locator('#tk-pdf-status')).toContainText(
      'missing or not supported',
    );
    await expect(page.locator('#tk-pdf-play')).toBeDisabled();
  });

  test('the Listen button on a PDF tab opens the viewer', async ({
    page,
    extensionId,
  }) => {
    const pdfBytes = fs.readFileSync(PDF_PATH);
    // Seen from a content script, Chrome's PDF viewer is a document with the
    // PDF content type and an <embed>; fetching the URL returns the PDF.
    await page.route(PDF_URL, async (route) => {
      if (route.request().resourceType() === 'document') {
        await route.fulfill({
          contentType: 'text/html',
          body: '<html><body style="margin:0"><embed type="application/pdf" src="about:blank" width="100%" height="100%"></body></html>',
        });
      } else {
        await route.fulfill({ contentType: 'application/pdf', body: pdfBytes });
      }
    });

    await page.goto(PDF_URL);
    const listenButton = page.locator('#talkient-pdf-launcher .listen');
    await expect(listenButton).toBeVisible({ timeout: 10000 });

    await listenButton.click();
    await page.waitForURL(
      `chrome-extension://${extensionId}/pdf-viewer/pdf-viewer.html**`,
      { timeout: 15000 },
    );
    expect(new URL(page.url()).searchParams.get('file')).toBe(PDF_URL);
    await expect(page.locator('.tk-pdf-page')).toHaveCount(2, {
      timeout: 15000,
    });
  });
});
