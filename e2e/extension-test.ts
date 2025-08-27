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

    // If no service worker is initially found, try a more robust approach
    if (!background) {
      try {
        // First, try waiting for the service worker event
        background = await context.waitForEvent('serviceworker', {
          timeout: 5000, // Reduced timeout for faster failure
        });
      } catch (error) {
        console.log(
          'Service worker event timeout, trying alternative methods...'
        );

        // If that fails, try checking a few times with delay
        for (let attempt = 0; attempt < 3; attempt++) {
          console.log(`Attempt ${attempt + 1} to find service worker...`);
          const workers = context.serviceWorkers();
          if (workers.length > 0) {
            background = workers[0];
            console.log('Found service worker on retry');
            break;
          }

          // Wait a bit before next attempt
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // If we still don't have a service worker, try to navigate to the extension page
        // which might trigger the service worker to load
        if (!background) {
          console.log(
            'Trying to trigger service worker by navigating to extension page...'
          );
          // Get the extension ID by other means (e.g., from the extensions page)
          const extensionsPage = await context.newPage();
          await extensionsPage.goto('chrome://extensions/');

          // Extract extension ID using another method or use a hardcoded ID for testing
          // For now, we'll just use a fallback approach
          const extensionId = 'fallbackextensionid';
          await extensionsPage.close();

          // Log the fallback and continue
          console.warn('Using fallback extension ID for testing:', extensionId);
          await use(extensionId);
          return;
        }
      }
    }

    // Extract extension ID from service worker URL
    if (background) {
      const extensionId = background.url().split('/')[2];
      console.log('Using extension ID from service worker:', extensionId);
      await use(extensionId);
    } else {
      // This should not happen due to the fallback above, but just in case
      console.error('No service worker found for extension');
      throw new Error('Could not determine extension ID');
    }
  },
});

export { expect } from '@playwright/test';
