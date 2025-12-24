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
    // Ensure we have at least one page open to trigger extension initialization
    let page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }
    
    // Navigate to a simple page to trigger the extension
    try {
        await page.goto('data:text/html,<html><body><h1>Trigger Extension</h1></body></html>');
    } catch (e) {
        console.log('Navigation to trigger page failed', e);
    }

    // Wait for the extension background service worker to be available
    let [background] = context.serviceWorkers();

    // If no service worker is initially found, try a more robust approach
    if (!background) {
      try {
        // First, try waiting for the service worker event
        background = await context.waitForEvent('serviceworker', {
          timeout: 10000, // Increased timeout
        });
      } catch (error) {
        console.log(
          'Service worker event timeout, trying polling...'
        );

        // If that fails, try checking a few times with delay
        for (let attempt = 0; attempt < 20; attempt++) {
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
        
        if (!background) {
             throw new Error('Could not find extension service worker after multiple attempts.');
        }
      }
    }

    // Extract extension ID from service worker URL
    if (background) {
      const extensionId = background.url().split('/')[2];
      console.log('Using extension ID from service worker:', extensionId);
      await use(extensionId);
    }
  },
});

export { expect } from '@playwright/test';
