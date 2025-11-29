import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Side Panel - Article Requirement for Play Buttons', () => {
  test('should not create play buttons on pages without article element', async ({
    page,
    context,
    extensionId,
  }) => {
    // Navigate to the test page WITHOUT an article element
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html'
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);

    // Wait for the page to load and content script to initialize
    await page.waitForTimeout(3000);

    console.log('Testing page without article element');
    console.log('Using extension ID from service worker:', extensionId);

    // Note: Side panel is always available (not conditional on article)
    // But play buttons should only be created when article exists

    // Test 2: Verify no play buttons are created (since there's no article)
    const playButtonCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    console.log('Play buttons found:', playButtonCount);
    expect(playButtonCount).toBe(0);

    // Test 3: Verify no processed elements
    const processedElementsCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-processed').length;
    });

    console.log('Processed elements found:', processedElementsCount);
    expect(processedElementsCount).toBe(0);

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/no-article-play-buttons-test.png',
      fullPage: true,
    });

    console.log(
      'Article requirement test completed successfully!'
    );
  });

  test('should create play buttons when article is present', async ({
    page,
    context,
    extensionId,
  }) => {
    // Start with the page that has an article
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'article-requirement-test.html'
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);
    await page.waitForTimeout(3000);

    console.log('Testing play button creation with article present');

    // Verify play buttons are created
    const playButtonCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    console.log('Play buttons found:', playButtonCount);
    expect(playButtonCount).toBeGreaterThan(0);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/with-article-play-buttons-test.png',
      fullPage: true,
    });

    console.log('Play buttons created successfully with article present!');
  });

  test('should verify play button visibility across different pages', async ({
    page,
    context,
    extensionId,
  }) => {
    // Test 1: Navigate to page WITHOUT article
    console.log('Step 1: Testing page without article');
    const noArticlePagePath = path.join(
      __dirname,
      'test-pages',
      'no-article-test.html'
    );
    const noArticleUrl = `file://${noArticlePagePath.replace(/\\/g, '/')}`;

    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    const playButtonsOnNoArticlePage = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    console.log(
      'Play buttons on no-article page:',
      playButtonsOnNoArticlePage
    );
    expect(playButtonsOnNoArticlePage).toBe(0);

    // Test 2: Navigate to page WITH article
    console.log('Step 2: Testing page with article');
    const withArticlePagePath = path.join(
      __dirname,
      'test-pages',
      'example.html'
    );
    const withArticleUrl = `file://${withArticlePagePath.replace(/\\/g, '/')}`;

    await page.goto(withArticleUrl);
    await page.waitForTimeout(3000);

    const playButtonsOnArticlePage = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    console.log('Play buttons on article page:', playButtonsOnArticlePage);
    expect(playButtonsOnArticlePage).toBeGreaterThan(0);

    // Test 3: Go back to page WITHOUT article
    console.log('Step 3: Going back to page without article');
    await page.goto(noArticleUrl);
    await page.waitForTimeout(3000);

    const playButtonsAfterNavigation = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    console.log(
      'Play buttons after returning to no-article page:',
      playButtonsAfterNavigation
    );
    expect(playButtonsAfterNavigation).toBe(0);

    console.log('Cross-page navigation test completed successfully!');
  });
});
