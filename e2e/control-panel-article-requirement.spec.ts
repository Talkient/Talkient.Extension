import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Control Panel - Article Requirement', () => {
  test('should skip control panel on pages without an article element', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Navigate to the test page WITHOUT an article element.
    // The control panel should not be injected on pages that do not contain <article>.
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html',
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);

    // Wait for the page to load and content script to initialize
    await page.waitForTimeout(3000);

    // Test 1: Verify control panel is not created without <article>
    const controlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelExists).toBe(false);

    // Test 2: Verify play buttons are not created without <article>
    const playButtonCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    expect(playButtonCount).toBe(0);

    // Test 3: Verify processed elements do not exist
    const processedElementsCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-processed').length;
    });

    expect(processedElementsCount).toBe(0);

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

  test('should verify control panel stays hidden on pages without an article element', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Test 1: Navigate to page without <article>
    const noArticlePagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html',
    );
    const noArticleUrl = `file://${noArticlePagePath.replace(/\\/g, '/')}`;

    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    // The control panel should stay hidden because there is no <article>
    const controlPanelOnNoArticlePage = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelOnNoArticlePage).toBe(false);

    // Test 2: Navigate to page WITH article
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

    // Test 3: Go back to page without <article> — panel stays hidden
    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    const controlPanelAfterNavigation = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelAfterNavigation).toBe(false);
  });
});
