import { test, expect } from './extension-test';

test.describe('Article Requirement Tests', () => {
  test('should only process text within article tags and ignore text outside', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Navigate to the test page
    const path = require('path');
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'article-requirement-test.html',
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);

    // Wait for the page to load and content script to initialize
    await page.waitForTimeout(3000);

    // Force reprocessing to ensure everything is processed
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);
    });

    await page.waitForTimeout(1000);

    // Test 1: Check that header paragraph does NOT have a play button
    const headerHasButton = await page.evaluate(() => {
      const headerPara = document.querySelector('header p');
      if (!headerPara) return null;
      const wrapper = headerPara.closest('.talkient-processed');
      return wrapper !== null;
    });

    expect(headerHasButton).toBe(false);

    // Test 2: Check that nav paragraph does NOT have a play button
    const navHasButton = await page.evaluate(() => {
      const navPara = document.querySelector('nav p');
      if (!navPara) return null;
      const wrapper = navPara.closest('.talkient-processed');
      return wrapper !== null;
    });

    expect(navHasButton).toBe(false);

    // Test 3: Check that aside paragraph does NOT have a play button
    const asideHasButton = await page.evaluate(() => {
      const asidePara = document.querySelector('aside p');
      if (!asidePara) return null;
      const wrapper = asidePara.closest('.talkient-processed');
      return wrapper !== null;
    });

    expect(asideHasButton).toBe(false);

    // Test 4: Check that footer paragraph does NOT have a play button
    const footerHasButton = await page.evaluate(() => {
      const footerPara = document.querySelector('footer p');
      if (!footerPara) return null;
      const wrapper = footerPara.closest('.talkient-processed');
      return wrapper !== null;
    });

    expect(footerHasButton).toBe(false);

    // Test 5: Check that article paragraph DOES have a play button
    const articlePara1HasButton = await page.evaluate(() => {
      const articlePara = document.getElementById('article-para-1');
      if (!articlePara) return null;
      const wrapper = articlePara.closest('.talkient-processed');
      const button = wrapper?.querySelector('.talkient-play-button');
      return button !== null;
    });

    expect(articlePara1HasButton).toBe(true);

    // Test 6: Check that second article paragraph DOES have a play button
    const articlePara2HasButton = await page.evaluate(() => {
      const articlePara = document.getElementById('article-para-2');
      if (!articlePara) return null;
      const wrapper = articlePara.closest('.talkient-processed');
      const button = wrapper?.querySelector('.talkient-play-button');
      return button !== null;
    });

    expect(articlePara2HasButton).toBe(true);

    // Test 7: Check that deeply nested paragraph in article DOES have a play button
    const nestedParaHasButton = await page.evaluate(() => {
      const nestedPara = document.getElementById('nested-para');
      if (!nestedPara) return null;
      const wrapper = nestedPara.closest('.talkient-processed');
      const button = wrapper?.querySelector('.talkient-play-button');
      return button !== null;
    });

    expect(nestedParaHasButton).toBe(true);

    // Test 8: Check that second article paragraph DOES have a play button
    const secondArticleParaHasButton = await page.evaluate(() => {
      const secondArticlePara = document.getElementById('second-article-para');
      if (!secondArticlePara) return null;
      const wrapper = secondArticlePara.closest('.talkient-processed');
      const button = wrapper?.querySelector('.talkient-play-button');
      return button !== null;
    });

    expect(secondArticleParaHasButton).toBe(true);

    // Test 9: Count total play buttons on page - should only be in article tags
    const totalPlayButtons = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    // We should have buttons only for elements in article tags
    // Exact count may vary based on how text is split, but it should be > 0 and < total paragraphs
    expect(totalPlayButtons).toBeGreaterThan(0);

    // Test 10: Verify all play buttons are within article tags
    const allButtonsInArticles = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.talkient-play-button');
      return Array.from(buttons).every((button) => {
        return button.closest('article') !== null;
      });
    });

    expect(allButtonsInArticles).toBe(true);

    // Take a screenshot for manual verification
    await page.screenshot({
      path: 'e2e-results/article-requirement-test.png',
      fullPage: true,
    });
  });

  test('should not process excluded elements even when inside article tags', async ({
    page,
    context: _context,
    extensionId: _extensionId,
  }) => {
    // Navigate to the test page
    const path = require('path');
    const testPagePath = path.join(
      __dirname,
      'test-pages',
      'excluded-elements-in-article-test.html',
    );
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    await page.goto(fileUrl);
    await page.waitForTimeout(3000);

    // Detailed debugging (evaluated for side effects, result intentionally unused)
    await page.evaluate(() => {
      const code = document.getElementById('code-elem');
      const normalPara = document.getElementById('normal-para');

      return {
        codeElement: {
          exists: code !== null,
          tagName: code?.tagName,
          textContent: code?.textContent?.substring(0, 50),
          hasProcessedParent: code?.closest('.talkient-processed') !== null,
          hasPlayButton: code?.querySelector('.talkient-play-button') !== null,
        },
        normalPara: {
          exists: normalPara !== null,
          tagName: normalPara?.tagName,
          textContent: normalPara?.textContent?.substring(0, 50),
          hasProcessedParent:
            normalPara?.closest('.talkient-processed') !== null,
          hasPlayButton:
            normalPara?.querySelector('.talkient-play-button') !== null,
        },
        allButtons: document.querySelectorAll('.talkient-play-button').length,
      };
    });

    // Force reprocessing
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);
    });

    await page.waitForTimeout(1000);

    // Test: Normal paragraph should have button
    const normalParaHasButton = await page.evaluate(() => {
      const para = document.getElementById('normal-para');
      const wrapper = para?.closest('.talkient-processed');
      return wrapper?.querySelector('.talkient-play-button') !== null;
    });

    expect(normalParaHasButton).toBe(true);

    // Test: Code element should NOT have button
    const codeHasButton = await page.evaluate(() => {
      const code = document.getElementById('code-elem');
      if (!code) return null;

      // Check if any text nodes within the code element have been processed
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(
        code,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      // Check if any of these text nodes are wrapped in talkient-processed
      return textNodes.some((textNode) => {
        const wrapper = textNode.parentElement?.closest('.talkient-processed');
        return wrapper !== null;
      });
    });

    expect(codeHasButton).toBe(false);

    // Test: Button element should NOT have button
    const buttonHasButton = await page.evaluate(() => {
      const button = document.getElementById('button-elem');
      if (!button) return null;

      // Check if any text nodes within the button element have been processed
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(
        button,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      // Check if any of these text nodes are wrapped in talkient-processed
      const hasProcessedText = textNodes.some((textNode) => {
        const wrapper = textNode.parentElement?.closest('.talkient-processed');
        return wrapper !== null;
      });

      // Also check if there's a play button as a sibling or child
      const hasPlayButtonChild =
        button.querySelector('.talkient-play-button') !== null;
      const hasPlayButtonSibling =
        button.nextElementSibling?.classList.contains('talkient-play-button') ||
        false;

      console.log('Button debug:', {
        hasProcessedText,
        hasPlayButtonChild,
        hasPlayButtonSibling,
        textContent: button.textContent?.substring(0, 50),
      });

      return hasProcessedText || hasPlayButtonChild || hasPlayButtonSibling;
    });

    expect(buttonHasButton).toBe(false);

    // Test: Another normal paragraph should have button
    const anotherParaHasButton = await page.evaluate(() => {
      const para = document.getElementById('another-normal-para');
      const wrapper = para?.closest('.talkient-processed');
      return wrapper?.querySelector('.talkient-play-button') !== null;
    });

    expect(anotherParaHasButton).toBe(true);

    await page.screenshot({
      path: 'e2e-results/excluded-elements-in-article-test.png',
      fullPage: true,
    });
  });
});
