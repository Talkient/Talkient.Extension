import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Control Panel - Article Requirement', () => {
  test('should not create control panel on pages without article element', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Navigate to the test page WITHOUT an article element
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html',
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);

    // Wait for the page to load and content script to initialize
    await page.waitForTimeout(3000);

    // Test 1: Verify no control panel is created
    const controlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelExists).toBe(false);

    // Test 2: Verify no play buttons are created (since there's no article)
    const playButtonCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    expect(playButtonCount).toBe(0);

    // Test 3: Verify no processed elements
    const processedElementsCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-processed').length;
    });

    expect(processedElementsCount).toBe(0);

    // Test 4: Try to force reload play buttons and verify control panel is still not created
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);
    });

    await page.waitForTimeout(1000);

    const controlPanelExistsAfterReload = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelExistsAfterReload).toBe(false);

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

  test('should verify control panel visibility across different pages', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Test 1: Navigate to page WITHOUT article
    const noArticlePagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html',
    );
    const noArticleUrl = `file://${noArticlePagePath.replace(/\\/g, '/')}`;

    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

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

    // Test 3: Go back to page WITHOUT article
    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    const controlPanelAfterNavigation = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelAfterNavigation).toBe(false);
  });
});
