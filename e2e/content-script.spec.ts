import { test, expect } from './extension-test';
import * as path from 'path';

const TEST_PAGE_URL = `file://${path.resolve(__dirname, 'test-pages/example.html').replace(/\\/g, '/')}`;
const ARTICLE_REQUIREMENT_URL = `file://${path.resolve(__dirname, 'test-pages/article-requirement-test.html').replace(/\\/g, '/')}`;

test.describe('Talkient Content Script', () => {
  test('injects the content UI into processable article content', async ({
    page,
  }) => {
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('#talkient-control-panel', { timeout: 10000 });
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    await expect(page.locator('#talkient-control-panel')).toBeVisible();
    await expect(page.locator('article .talkient-play-button')).toHaveCount(1);
    await expect(page.locator('article .talkient-play-button')).toBeVisible();
  });

  test('keeps content outside article tags untouched', async ({ page }) => {
    await page.goto(ARTICLE_REQUIREMENT_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#talkient-control-panel', { timeout: 10000 });
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    const processingState = await page.evaluate(() => {
      const hasProcessedWrapper = (selector: string) => {
        const el = document.querySelector(selector);
        return el?.closest('.talkient-processed') !== null;
      };

      return {
        header: hasProcessedWrapper('header p'),
        nav: hasProcessedWrapper('nav p'),
        aside: hasProcessedWrapper('aside p'),
        footer: hasProcessedWrapper('footer p'),
      };
    });

    expect(processingState.header).toBe(false);
    expect(processingState.nav).toBe(false);
    expect(processingState.aside).toBe(false);
    expect(processingState.footer).toBe(false);
  });
});
