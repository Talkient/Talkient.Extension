import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Button Position Visual Tests', () => {
  test.setTimeout(60000);

  test('should display buttons on the left when configured', async ({
    page,
    context,
    extensionId,
  }) => {
    // First, set the button position to left in options
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForSelector('h1:has-text("Talkient Settings")');
    await page.waitForSelector('#button-position-select');
    await page.selectOption('#button-position-select', 'left');
    await page.waitForTimeout(500);

    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html'
    );

    // Verify the file exists
    expect(fs.existsSync(testHtmlPath)).toBeTruthy();

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);
    await page.waitForLoadState('networkidle');

    // Force content script to process the page
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);

      const dummyElem = document.createElement('div');
      dummyElem.id = 'talkient-mutation-trigger';
      document.body.appendChild(dummyElem);
      setTimeout(() => dummyElem.remove(), 500);
    });

    // Wait for play buttons to appear
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Verify buttons have the left class
    const hasLeftClass = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.talkient-play-button');
      if (buttons.length === 0) return false;

      // Check if at least one button has the left class
      return Array.from(buttons).some((button) =>
        button.classList.contains('talkient-button-left')
      );
    });

    expect(hasLeftClass).toBeTruthy();

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/button-position-left-screenshot.png',
      fullPage: true,
    });

    console.log('Buttons are positioned on the left');
  });

  test('should display buttons on the right when configured', async ({
    page,
    context,
    extensionId,
  }) => {
    // First, set the button position to right in options
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForSelector('h1:has-text("Talkient Settings")');
    await page.waitForSelector('#button-position-select');
    await page.selectOption('#button-position-select', 'right');
    await page.waitForTimeout(500);

    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html'
    );

    // Verify the file exists
    expect(fs.existsSync(testHtmlPath)).toBeTruthy();

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);
    await page.waitForLoadState('networkidle');

    // Force content script to process the page
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);

      const dummyElem = document.createElement('div');
      dummyElem.id = 'talkient-mutation-trigger';
      document.body.appendChild(dummyElem);
      setTimeout(() => dummyElem.remove(), 500);
    });

    // Wait for play buttons to appear
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Verify buttons do NOT have the left class
    const hasLeftClass = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.talkient-play-button');
      if (buttons.length === 0) return false;

      // Check if any button has the left class
      return Array.from(buttons).some((button) =>
        button.classList.contains('talkient-button-left')
      );
    });

    expect(hasLeftClass).toBeFalsy();

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/button-position-right-screenshot.png',
      fullPage: true,
    });

    console.log('Buttons are positioned on the right');
  });

  test('should change button position dynamically', async ({
    page,
    context,
    extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html'
    );

    expect(fs.existsSync(testHtmlPath)).toBeTruthy();

    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Start with buttons on the right
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForSelector('h1:has-text("Talkient Settings")');
    await page.waitForSelector('#button-position-select');
    await page.selectOption('#button-position-select', 'right');
    await page.waitForTimeout(500);

    // Navigate to test page
    await page.goto(testPageUrl);
    await page.waitForLoadState('networkidle');

    // Wait for play buttons with timeout
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {
        console.log('Initial buttons not found, forcing reprocess');
      });

    // Force reprocess if needed
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);
    });

    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Take screenshot of right position
    await page.screenshot({
      path: 'e2e-results/button-position-dynamic-right-screenshot.png',
    });

    // Change to left in options
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForSelector('h1:has-text("Talkient Settings")');
    await page.waitForSelector('#button-position-select');
    await page.selectOption('#button-position-select', 'left');
    await page.waitForTimeout(1000); // Wait for storage change to propagate

    // Go back to test page (storage change should trigger reprocessing)
    await page.goto(testPageUrl);
    await page.waitForLoadState('networkidle');

    // Wait for buttons to be reprocessed with new position
    await page.waitForTimeout(2000);

    // Force reprocess to apply new setting
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);
    });

    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Verify buttons now have the left class
    const hasLeftClass = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.talkient-play-button');
      return Array.from(buttons).some((button) =>
        button.classList.contains('talkient-button-left')
      );
    });

    expect(hasLeftClass).toBeTruthy();

    // Take screenshot of left position
    await page.screenshot({
      path: 'e2e-results/button-position-dynamic-left-screenshot.png',
    });

    console.log('Button position changed dynamically from right to left');
  });
});
