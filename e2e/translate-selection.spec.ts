import { test, expect } from './extension-test';
import * as path from 'path';

const TEST_PAGE_URL = `file://${path.resolve(__dirname, 'test-pages/example.html').replace(/\\/g, '/')}`;

async function getServiceWorker(context: {
  serviceWorkers(): Array<{
    evaluate<R, Arg>(
      pageFunction: (arg: Arg) => R | Promise<R>,
      arg?: Arg,
    ): Promise<R>;
  }>;
  waitForEvent(
    event: 'serviceworker',
    options?: { timeout?: number },
  ): Promise<{
    evaluate<R, Arg>(
      pageFunction: (arg: Arg) => R | Promise<R>,
      arg?: Arg,
    ): Promise<R>;
  }>;
}) {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', {
      timeout: 5000,
    });
  }
  return serviceWorker;
}

async function triggerTranslateMenu(
  serviceWorker: {
    evaluate<R, Arg>(
      pageFunction: (arg: Arg) => R | Promise<R>,
      arg?: Arg,
    ): Promise<R>;
  },
  selectedText: string,
) {
  await serviceWorker.evaluate(async (text) => {
    const handler = (
      self as unknown as {
        __talkientOnContextMenuClick?: (
          info: chrome.contextMenus.OnClickData,
          tab?: chrome.tabs.Tab,
        ) => void;
      }
    ).__talkientOnContextMenuClick;

    if (!handler) {
      throw new Error('Context menu click handler not found');
    }

    const tabId = await new Promise<number>((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const activeTabId = tabs[0]?.id;
        if (!activeTabId) {
          reject(new Error('No active tab found for translation test'));
          return;
        }

        resolve(activeTabId);
      });
    });

    handler(
      {
        menuItemId: 'talkient-translate-text',
        selectionText: text,
      } as chrome.contextMenus.OnClickData,
      { id: tabId } as chrome.tabs.Tab,
    );
  }, selectedText);
}

test.describe('Selection translation', () => {
  test('renders translation result card after context menu translate action', async ({
    page,
    context,
  }) => {
    await page.goto(TEST_PAGE_URL);
    await page.waitForSelector('#talkient-control-panel');

    await page.locator('article p').first().selectText();
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString() ?? '';
    });
    expect(selectedText).toContain('This domain is for use');

    const serviceWorker = await getServiceWorker(context);

    await serviceWorker.evaluate(() => {
      self.fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            translatedText: 'Bonjour texte selectionne pour la traduction.',
            detectedLanguage: { language: 'en' },
          }),
        } as unknown as Response;
      };
    });

    await triggerTranslateMenu(serviceWorker, selectedText);

    await expect(page.locator('#talkient-translation-result')).toBeVisible();
    await expect(page.locator('.talkient-translation-text')).toContainText(
      'Bonjour texte selectionne',
    );
  });

  test('uses configured target language in translation request', async ({
    page,
    context,
  }) => {
    await page.goto(TEST_PAGE_URL);
    await page.waitForSelector('#talkient-control-panel');

    await page.locator('article p').first().selectText();
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString() ?? '';
    });

    const serviceWorker = await getServiceWorker(context);
    await serviceWorker.evaluate(() => {
      chrome.storage.local.set({ translationTargetLanguage: 'pt' });
      self.fetch = async (_input, init) => {
        const body = JSON.parse((init?.body as string) ?? '{}') as {
          target?: string;
        };
        const translatedText =
          body.target === 'pt'
            ? 'Texto traduzido para portugues.'
            : 'Wrong target language';

        return {
          ok: true,
          status: 200,
          json: async () => ({
            translatedText,
            detectedLanguage: { language: 'en' },
          }),
        } as unknown as Response;
      };
    });

    await triggerTranslateMenu(serviceWorker, selectedText);

    await expect(page.locator('.talkient-translation-text')).toContainText(
      'Texto traduzido para portugues.',
    );
    await expect(page.locator('.talkient-translation-meta')).toContainText(
      'en -> pt',
    );
  });

  test('shows translation error UI when providers fail', async ({
    page,
    context,
  }) => {
    await page.goto(TEST_PAGE_URL);
    await page.waitForSelector('#talkient-control-panel');

    await page.locator('article p').first().selectText();
    const selectedText = await page.evaluate(() => {
      return window.getSelection()?.toString() ?? '';
    });

    const serviceWorker = await getServiceWorker(context);
    await serviceWorker.evaluate(() => {
      self.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };
    });

    await triggerTranslateMenu(serviceWorker, selectedText);

    await expect(page.locator('#talkient-translation-result')).toBeVisible();
    await expect(page.locator('.talkient-translation-title')).toContainText(
      'Translation failed',
    );
    await expect(page.locator('.talkient-translation-meta')).toContainText(
      'Code: NETWORK_ERROR',
    );
    await expect(page.locator('.talkient-translation-status')).toContainText(
      'Translation providers are currently unavailable.',
    );
  });
});
