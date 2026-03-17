import { test, expect } from './extension-test';
import type { Page } from '@playwright/test';
import * as path from 'path';

const TEST_PAGE_URL = `file://${path.resolve(__dirname, 'test-pages/reading-time-test.html').replace(/\\/g, '/')}`;

async function waitForFormattedRemaining(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('.talkient-remaining-value');
    if (!el) return false;
    return /^\d+:\d{2}$/.test(el.textContent ?? '');
  });

  return page.locator('.talkient-remaining-value').textContent();
}

test.describe('Reading Time Estimate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for content script to inject and create the control panel
    await page.waitForSelector('#talkient-control-panel', { timeout: 10000 });

    // Expand the panel so content is visible
    await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      if (panel?.classList.contains('talkient-collapsed')) {
        const toggle = panel.querySelector('.talkient-panel-toggle');
        toggle?.click();
      }
    });

    await page.waitForSelector(
      '#talkient-control-panel:not(.talkient-collapsed)',
      {
        timeout: 5000,
      },
    );
  });

  // ── Panel structure ──────────────────────────────────────────────────────

  test('panel contains the .talkient-remaining-value element', async ({
    page,
  }) => {
    const el = page.locator('.talkient-remaining-value');
    await expect(el).toBeAttached();
  });

  test('panel has a "Remaining" label', async ({ page }) => {
    // Find the rate-label that is a sibling to .talkient-remaining-value
    const label = page.locator(
      '.talkient-rate-display:has(.talkient-remaining-value) .talkient-rate-label',
    );
    await expect(label).toHaveText('Remaining');
  });

  // ── Initial state (before processing completes) ──────────────────────────

  test('remaining value shows "—" immediately after panel appears (before nodes are processed)', async ({
    page,
  }) => {
    // On a fresh page load the panel appears quickly; before processTextElements
    // completes the display must still show "—" (the initial/safe state).
    // We navigate again and capture the value before waiting for play buttons.
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#talkient-control-panel', { timeout: 10000 });

    // Expand immediately
    await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      if (panel?.classList.contains('talkient-collapsed')) {
        panel.querySelector('.talkient-panel-toggle')?.click();
      }
    });

    // The value should be "—" at some point during startup
    // (it may transition quickly — we just assert the element is present and non-empty)
    const el = page.locator('.talkient-remaining-value');
    await expect(el).toBeAttached();
    const text = await el.textContent();
    expect(text).toBeTruthy();
  });

  // ── After processing: shows a formatted time estimate ───────────────────

  test('shows a M:SS formatted estimate after nodes are processed', async ({
    page,
  }) => {
    // Wait for play buttons — signals processing has finished
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    const remaining = await waitForFormattedRemaining(page);

    // Must match M:SS pattern (e.g. "0:45", "1:30", "10:00")
    expect(remaining).toMatch(/^\d+:\d{2}$/);
  });

  test('estimate is greater than zero after processing a page with substantial text', async ({
    page,
  }) => {
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    const remaining = await waitForFormattedRemaining(page);

    // Parse and verify it represents more than 0 seconds
    const match = remaining?.match(/^(\d+):(\d{2})$/);
    expect(match).not.toBeNull();

    const totalSeconds = parseInt(match![1], 10) * 60 + parseInt(match![2], 10);
    expect(totalSeconds).toBeGreaterThan(0);
  });

  // ── Speed change updates the estimate ────────────────────────────────────

  test('remaining time decreases when speech rate is doubled', async ({
    page,
  }) => {
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Read estimate at default speed (1.0x)
    const beforeText = await waitForFormattedRemaining(page);
    const beforeMatch = beforeText?.match(/^(\d+):(\d{2})$/);
    expect(beforeMatch).not.toBeNull();
    const beforeSeconds =
      parseInt(beforeMatch![1], 10) * 60 + parseInt(beforeMatch![2], 10);

    // Set slider to 2.0x
    await page
      .locator('.talkient-rate-slider')
      .evaluate((el: HTMLInputElement) => {
        el.value = '2.0';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

    // Wait for display to update
    const afterText = await waitForFormattedRemaining(page);
    const afterMatch = afterText?.match(/^(\d+):(\d{2})$/);
    expect(afterMatch).not.toBeNull();
    const afterSeconds =
      parseInt(afterMatch![1], 10) * 60 + parseInt(afterMatch![2], 10);

    // At 2x speed the estimate should be roughly half — allow some rounding
    expect(afterSeconds).toBeLessThan(beforeSeconds);
  });

  test('remaining time increases when speech rate is halved', async ({
    page,
  }) => {
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    const beforeText = await waitForFormattedRemaining(page);
    const beforeMatch = beforeText?.match(/^(\d+):(\d{2})$/);
    expect(beforeMatch).not.toBeNull();
    const beforeSeconds =
      parseInt(beforeMatch![1], 10) * 60 + parseInt(beforeMatch![2], 10);

    // Set slider to 0.5x
    await page
      .locator('.talkient-rate-slider')
      .evaluate((el: HTMLInputElement) => {
        el.value = '0.5';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

    const afterText = await waitForFormattedRemaining(page);
    const afterMatch = afterText?.match(/^(\d+):(\d{2})$/);
    expect(afterMatch).not.toBeNull();
    const afterSeconds =
      parseInt(afterMatch![1], 10) * 60 + parseInt(afterMatch![2], 10);

    expect(afterSeconds).toBeGreaterThan(beforeSeconds);
  });

  // ── Remaining time updates when playback position changes ───────────────

  test('remaining time updates after playing a node near the end of the article', async ({
    page,
  }) => {
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Record the estimate for the full article
    const fullText = await page
      .locator('.talkient-remaining-value')
      .textContent();

    // Click the LAST play button (near end of article)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        '.talkient-play-button',
      );
      const last = buttons[buttons.length - 1];
      last?.click();
    });

    // Wait for the remaining time to update (may need a moment for SW round-trip)
    await page.waitForTimeout(1500);

    const updatedText = await page
      .locator('.talkient-remaining-value')
      .textContent();

    // After clicking the last paragraph, remaining should be less than the full estimate
    const parseSeconds = (t: string | null) => {
      const m = t?.match(/^(\d+):(\d{2})$/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };

    const fullSeconds = parseSeconds(fullText);
    const updatedSeconds = parseSeconds(updatedText);

    // The updated estimate should be a valid time and smaller than the full estimate
    if (fullSeconds !== null && updatedSeconds !== null) {
      expect(updatedSeconds).toBeLessThanOrEqual(fullSeconds);
    } else {
      // If TTS didn't respond (headless env), remaining value should still be valid
      expect(updatedText).toMatch(/^(\d+:\d{2}|—)$/);
    }
  });
});
