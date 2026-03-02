import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Extension setup for Playwright
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    // Build the extension first
    const distPath = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error(
        'Extension dist folder not found. Please build the extension first with "pnpm build"',
      );
    }

    // Launch browser with the extension loaded
    const context = await chromium.launchPersistentContext('', {
      headless: false, // We use --headless=new in args instead
      args: [
        `--disable-extensions-except=${distPath}`,
        `--load-extension=${distPath}`,
        '--headless=new', // Use new headless mode
      ],
    });

    await use(context);
    await context.close();
  },

  // Extract the extension ID for use in tests
  extensionId: async ({ context }, use) => {
    // ── Path 1: service worker already tracked by Playwright ─────────────────
    let background = context.serviceWorkers()[0];
    if (background) {
      const extensionId = background.url().split('/')[2];
      console.log('Using extension ID from service worker:', extensionId);
      await use(extensionId);
      return;
    }

    // ── Path 2: wait briefly for the service worker to appear ────────────────
    // Subscribe to future events before any navigation so we don't miss a
    // restart triggered by the tab creation below.
    const swPromise = context
      .waitForEvent('serviceworker', { timeout: 5000 })
      .catch(() => null);

    // Creating a new page fires chrome.tabs.onActivated, which Chrome uses to
    // wake extension service workers that are registered but stopped.
    const triggerPage = await context.newPage();
    try {
      await triggerPage.goto(
        'data:text/html,<html><body><h1>Trigger Extension</h1></body></html>',
      );
    } catch (e) {
      console.log('Navigation to trigger page failed', e);
    }

    background = context.serviceWorkers()[0];
    if (!background) {
      const sw = await swPromise;
      if (sw) background = sw;
    }

    if (background) {
      const extensionId = background.url().split('/')[2];
      console.log('Using extension ID from service worker:', extensionId);
      await use(extensionId);
      return;
    }

    // ── Path 3: chrome://extensions fallback ─────────────────────────────────
    // When the service worker's entire lifecycle (register → activate → idle →
    // terminate) completes before Playwright's CDP is ready to track it, the
    // serviceworker event is never emitted. In that case we read the extension
    // ID directly from Chrome's extension registry — no service worker needed.
    console.log(
      'Service worker not found via Playwright, falling back to chrome://extensions',
    );
    const extPage = await context.newPage();
    try {
      await extPage.goto('chrome://extensions');
      await extPage.waitForLoadState('domcontentloaded');

      const extensionId = await extPage.evaluate(
        async (): Promise<string | null> => {
          // chrome://extensions is a privileged Chrome page with access to
          // chrome.management, which lists all installed extensions.
          if (typeof chrome === 'undefined' || !chrome.management) return null;
          return new Promise((resolve) => {
            chrome.management.getAll((extensions) => {
              const ext = extensions.find(
                (e) =>
                  e.installType === 'development' &&
                  e.type === 'extension' &&
                  e.enabled,
              );
              resolve(ext?.id ?? null);
            });
          });
        },
      );

      if (extensionId) {
        console.log(
          'Using extension ID from chrome://extensions:',
          extensionId,
        );
        await use(extensionId);
        return;
      }
    } catch (e) {
      console.log('chrome://extensions fallback failed:', e);
    } finally {
      await extPage.close().catch(() => {});
    }

    throw new Error(
      'Could not determine extension ID via service worker or chrome://extensions.',
    );
  },
});

export { expect } from '@playwright/test';
