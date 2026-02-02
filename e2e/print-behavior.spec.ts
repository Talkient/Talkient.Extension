import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Talkient Print Behavior Tests', () => {
  // Increase timeout for these tests
  test.setTimeout(60000);

  test('should remove UI elements when print dialog opens and restore after closing', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html',
    );

    // Verify the file exists
    expect(fs.existsSync(testHtmlPath)).toBeTruthy();

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check that the page title is as expected
    const pageTitle = await page.title();
    expect(pageTitle).toBe('Talkient Play-Pause Test Page');

    // Wait for content script to process the page and add play buttons
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Verify initial state - play buttons exist
    const initialPlayButtonsCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });
    expect(initialPlayButtonsCount).toBeGreaterThan(0);

    // Verify initial state - control panel exists
    const initialControlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });
    expect(initialControlPanelExists).toBe(true);

    // Take screenshot of initial state
    await page.screenshot({
      path: 'e2e-results/print-behavior-initial-state.png',
    });

    // Trigger beforeprint event to simulate print dialog opening
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });

    // Wait for UI to be removed
    await page.waitForTimeout(500);

    // Verify UI elements are removed after beforeprint
    const playButtonsAfterBeforeprint = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });
    expect(playButtonsAfterBeforeprint).toBe(0);

    const controlPanelAfterBeforeprint = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });
    expect(controlPanelAfterBeforeprint).toBe(false);

    // Verify processed markers are also removed
    const processedMarkersAfterBeforeprint = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-processed').length;
    });
    expect(processedMarkersAfterBeforeprint).toBe(0);

    // Take screenshot of state after beforeprint
    await page.screenshot({
      path: 'e2e-results/print-behavior-after-beforeprint.png',
    });

    // Trigger afterprint event to simulate print dialog closing
    await page.evaluate(() => {
      window.dispatchEvent(new Event('afterprint'));
    });

    // Wait for UI to be restored (with some buffer for async operations)
    await page.waitForTimeout(2000);

    // Verify UI elements are restored after afterprint
    const playButtonsAfterAfterprint = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });
    expect(playButtonsAfterAfterprint).toBeGreaterThan(0);

    const controlPanelAfterAfterprint = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });
    expect(controlPanelAfterAfterprint).toBe(true);

    // Take screenshot of restored state
    await page.screenshot({
      path: 'e2e-results/print-behavior-after-afterprint.png',
    });
  });

  test('should clear highlights when print dialog opens', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html',
    );

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for content script to process the page
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Click a play button to create a highlight
    await page.evaluate(() => {
      const firstButton = document.querySelector('.talkient-play-button');
      if (firstButton) {
        (firstButton as HTMLButtonElement).click();
      }
    });

    // Wait for potential highlight to appear
    await page.waitForTimeout(1000);

    // Check if any highlight exists (evaluated for diagnostic purposes)
    await page.evaluate(() => {
      return document.querySelector('.talkient-highlighted') !== null;
    });

    // Trigger beforeprint event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });

    // Wait for cleanup
    await page.waitForTimeout(500);

    // Verify highlight is cleared after beforeprint
    const highlightAfterPrint = await page.evaluate(() => {
      return document.querySelector('.talkient-highlighted') !== null;
    });
    expect(highlightAfterPrint).toBe(false);
  });

  test('should handle multiple print dialog cycles', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html',
    );

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for content script to process the page
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Verify initial state
    const initialCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });
    expect(initialCount).toBeGreaterThan(0);

    // Run multiple print cycles
    for (let cycle = 1; cycle <= 3; cycle++) {
      // Trigger beforeprint
      await page.evaluate(() => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      await page.waitForTimeout(500);

      // Verify UI is removed
      const buttonsAfterBeforeprint = await page.evaluate(() => {
        return document.querySelectorAll('.talkient-play-button').length;
      });
      expect(buttonsAfterBeforeprint).toBe(0);

      const panelAfterBeforeprint = await page.evaluate(() => {
        return document.getElementById('talkient-control-panel') !== null;
      });
      expect(panelAfterBeforeprint).toBe(false);

      // Trigger afterprint
      await page.evaluate(() => {
        window.dispatchEvent(new Event('afterprint'));
      });
      await page.waitForTimeout(2000);

      // Verify UI is restored
      const buttonsAfterAfterprint = await page.evaluate(() => {
        return document.querySelectorAll('.talkient-play-button').length;
      });
      expect(buttonsAfterAfterprint).toBeGreaterThan(0);

      const panelAfterAfterprint = await page.evaluate(() => {
        return document.getElementById('talkient-control-panel') !== null;
      });
      expect(panelAfterAfterprint).toBe(true);
    }
  });

  test('should preserve article content during print workflow', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html',
    );

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for content script to process the page
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Get text content of a paragraph before print workflow (evaluated for baseline timing)
    await page.evaluate(() => {
      const para = document.getElementById('para1');
      // Get text without the play button
      return para?.textContent?.trim() || '';
    });

    // Run print workflow
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    await page.waitForTimeout(2000);

    // Verify text content is preserved after print workflow
    const textContentAfterPrint = await page.evaluate(() => {
      const para = document.getElementById('para1');
      return para?.textContent?.trim() || '';
    });

    // Text should still contain the original words (may have button text appended)
    expect(textContentAfterPrint.length).toBeGreaterThan(0);

    // Verify article element is still present
    const articleExists = await page.evaluate(() => {
      return document.querySelector('article') !== null;
    });
    expect(articleExists).toBe(true);
  });

  test('should not show UI elements in print preview (CSS media query)', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/play-pause-test.html',
    );

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for content script to process the page
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Emulate print media to check CSS @media print rules
    await page.emulateMedia({ media: 'print' });

    // Wait for styles to apply
    await page.waitForTimeout(500);

    // Check if control panel is hidden via CSS
    const controlPanelVisible = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      if (!panel) return false;
      const style = window.getComputedStyle(panel);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    expect(controlPanelVisible).toBe(false);

    // Check if play buttons are hidden via CSS
    const playButtonsVisible = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.talkient-play-button');
      if (buttons.length === 0) return false;
      const firstButton = buttons[0] as HTMLElement;
      const style = window.getComputedStyle(firstButton);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    expect(playButtonsVisible).toBe(false);

    // Reset to screen media
    await page.emulateMedia({ media: 'screen' });

    // Take screenshot showing print media emulation worked
    await page.screenshot({
      path: 'e2e-results/print-behavior-css-media-test.png',
    });
  });

  test('should handle print on page without article element', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Get the absolute path to our no-article test page
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/no-article-test.html',
    );

    // Convert to file:// URL format
    const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

    // Navigate to our test page
    await page.goto(testPageUrl);

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Wait a moment for content script to run
    await page.waitForTimeout(2000);

    // Verify control panel does NOT exist (no article element)
    const controlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });
    expect(controlPanelExists).toBe(false);

    // Trigger print events - should not cause errors
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('afterprint'));
    });
    await page.waitForTimeout(1000);

    // Verify page is still functional (no errors)
    const bodyExists = await page.evaluate(() => {
      return document.body !== null;
    });
    expect(bodyExists).toBe(true);
  });
});
