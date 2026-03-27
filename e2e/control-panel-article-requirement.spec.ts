import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Control Panel - Article Requirement', () => {
  test('should process pages with configurable processable elements (p, h1, h2 by default)', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Navigate to the test page WITHOUT an article element.
    // This page has <p>, <h1>, <h2> elements which ARE processable by default.
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html',
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);

    // Wait for the page to load and content script to initialize
    await page.waitForTimeout(3000);

    // Test 1: Verify control panel IS created because <p> elements are processable
    const controlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelExists).toBe(true);

    // Test 2: Verify play buttons ARE created for processable elements (p, h1, h2)
    const playButtonCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    expect(playButtonCount).toBeGreaterThan(0);

    // Test 3: Verify processed elements exist
    const processedElementsCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-processed').length;
    });

    expect(processedElementsCount).toBeGreaterThan(0);

    // Test 4: Verify all buttons are within a configured processable element
    const allButtonsInProcessable = await page.evaluate(() => {
      const processableTags = new Set(['article', 'p', 'h1', 'h2', 'h3', 'li']);
      const buttons = document.querySelectorAll('.talkient-play-button');
      return Array.from(buttons).every((button) => {
        let el: Element | null = button.parentElement;
        while (el) {
          if (processableTags.has(el.tagName.toLowerCase())) return true;
          el = el.parentElement;
        }
        return false;
      });
    });

    expect(allButtonsInProcessable).toBe(true);

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/no-article-control-panel-test.png',
      fullPage: true,
    });
  });

  test('should create control panel when article is added to page with article', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Start with the page that has an article
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'article-requirement-test.html',
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);
    await page.waitForTimeout(3000);

    // Verify control panel IS created when article exists
    const controlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelExists).toBe(true);

    // Verify play buttons are created
    const playButtonCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    expect(playButtonCount).toBeGreaterThan(0);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/with-article-control-panel-test.png',
      fullPage: true,
    });
  });

  test('should verify control panel visibility across different pages with processable elements', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Test 1: Navigate to page with processable elements (p, h1, h2 — no article needed)
    const noArticlePagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html',
    );
    const noArticleUrl = `file://${noArticlePagePath.replace(/\\/g, '/')}`;

    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    // Page has <p>, <h1>, <h2> so control panel SHOULD exist
    const controlPanelOnNoArticlePage = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelOnNoArticlePage).toBe(true);

    // Test 2: Navigate to page WITH article (also has processable content)
    const withArticlePagePath = path.join(
      __dirname,
      'test-pages',
      'example.html',
    );
    const withArticleUrl = `file://${withArticlePagePath.replace(/\\/g, '/')}`;

    await page.goto(withArticleUrl);
    await page.waitForTimeout(3000);

    const controlPanelOnArticlePage = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelOnArticlePage).toBe(true);

    // Test 3: Go back to page with processable elements — panel still appears
    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    const controlPanelAfterNavigation = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelAfterNavigation).toBe(true);
  });
});
