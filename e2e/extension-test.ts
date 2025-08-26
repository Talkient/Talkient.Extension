import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Extension setup for Playwright
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    // Build the extension first
    const distPath = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error(
        'Extension dist folder not found. Please build the extension first with "pnpm build"'
      );
    }

    // Launch browser with the extension loaded
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require a head
      args: [
        `--disable-extensions-except=${distPath}`,
        `--load-extension=${distPath}`,
      ],
    });

    await use(context);
    await context.close();
  },

  // Extract the extension ID for use in tests
  extensionId: async ({ context }, use) => {
    // Wait for the extension background service worker to be available
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    // Extract extension ID from service worker URL
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
