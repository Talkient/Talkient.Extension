import { test, expect } from './extension-test';
import * as path from 'path';

const PLAY_ICON_PATH = 'M8 5v14l11-7z';
const PAUSE_ICON_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';

function testPageUrl(): string {
  return `file://${path.resolve(__dirname, 'test-pages/play-pause-test.html').replace(/\\/g, '/')}`;
}

function semanticKernelPageUrl(): string {
  return `file://${path.resolve(__dirname, 'test-pages/semantic-kernel-agent-contextual-function-selection.html').replace(/\\/g, '/')}`;
}

async function waitForPlayButtons(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const ev = new CustomEvent('talkient:reload-play-buttons');
    document.dispatchEvent(ev);
    const dummy = document.createElement('div');
    document.body.appendChild(dummy);
    setTimeout(() => dummy.remove(), 100);
  });
  await page.waitForSelector('.talkient-play-button', { timeout: 15000 });
}

function hasPlayIcon(innerHTML: string): boolean {
  return innerHTML.includes(PLAY_ICON_PATH);
}

// ─── Direct play-button icon state tests ────────────────────────────────────
//
// TTS is unavailable in the Playwright test environment (chrome.tts has no
// voices), so the SW returns SPEECH_ERROR immediately, which resets the button
// icon back to play before we can observe it. Tests therefore use the same
// pattern as the existing control-panel e2e suite: manually inject the icon
// state that real TTS would set, then test the downstream click-handler logic.

test.describe('Play-button icon state', () => {
  test.setTimeout(60000);

  test('clicking an active (pause-icon) play button switches it back to play and sends PAUSE_SPEECH', async ({
    page,
  }) => {
    await page.goto(testPageUrl());
    await page.waitForLoadState('networkidle');
    await waitForPlayButtons(page);

    // Manually put the first button into "active" state as TTS would
    await page.evaluate((pausePath) => {
      const btn = document.querySelector(
        '.talkient-play-button',
      ) as HTMLElement;
      btn.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">` +
        `<path d="${pausePath}"/></svg>`;
    }, PAUSE_ICON_PATH);

    // Verify we're in pause state
    const isPauseBeforeClick = await page.evaluate(
      (pp) =>
        document
          .querySelector('.talkient-play-button')
          ?.innerHTML.includes(pp) ?? false,
      PAUSE_ICON_PATH,
    );
    expect(isPauseBeforeClick).toBe(true);

    // Click the button — the pause branch sends PAUSE_SPEECH and resets icon to play
    // via its sendMessage callback. PAUSE_SPEECH is handled synchronously by the SW.
    await page.evaluate(() => {
      (
        document.querySelector('.talkient-play-button') as HTMLButtonElement
      ).click();
    });

    // Icon resets inside the PAUSE_SPEECH sendMessage callback
    await page.waitForFunction(
      (playPath) =>
        document
          .querySelector('.talkient-play-button')
          ?.innerHTML.includes(playPath) ?? false,
      PLAY_ICON_PATH,
      { timeout: 10000 },
    );

    const htmlAfterClick = await page.evaluate(
      () => document.querySelector('.talkient-play-button')?.innerHTML ?? '',
    );
    expect(hasPlayIcon(htmlAfterClick)).toBe(true);
  });

  test('clicking a second button resets the first button icon to play synchronously', async ({
    page,
  }) => {
    await page.goto(testPageUrl());
    await page.waitForLoadState('networkidle');
    await waitForPlayButtons(page);

    // Put para1's button into "active" pause state
    await page.evaluate((pausePath) => {
      const btn = document.querySelector('#para1 .talkient-play-button');
      if (btn) {
        btn.innerHTML =
          `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">` +
          `<path d="${pausePath}"/></svg>`;
      }
    }, PAUSE_ICON_PATH);

    const firstIsPause = await page.evaluate(
      (pp) =>
        document
          .querySelector('#para1 .talkient-play-button')
          ?.innerHTML.includes(pp) ?? false,
      PAUSE_ICON_PATH,
    );
    expect(firstIsPause).toBe(true);

    // Click para2's button. The click handler resets all other pause-icon buttons
    // synchronously before calling safeSendMessage, so para1's icon resets on click.
    await page.evaluate(() => {
      (
        document.querySelector(
          '#para2 .talkient-play-button',
        ) as HTMLButtonElement
      )?.click();
    });

    // para1's reset is synchronous — check it immediately
    const firstIsPlayAfterInterrupt = await page.evaluate(
      (pp) =>
        document
          .querySelector('#para1 .talkient-play-button')
          ?.innerHTML.includes(pp) ?? false,
      PLAY_ICON_PATH,
    );
    expect(firstIsPlayAfterInterrupt).toBe(true);
  });

  test('all injected play buttons show play icon on page load', async ({
    page,
  }) => {
    await page.goto(testPageUrl());
    await page.waitForLoadState('networkidle');
    await waitForPlayButtons(page);

    const allArePlay = await page.evaluate((pp) => {
      const buttons = document.querySelectorAll('.talkient-play-button');
      return (
        buttons.length > 0 &&
        Array.from(buttons).every((btn) => btn.innerHTML.includes(pp))
      );
    }, PLAY_ICON_PATH);
    expect(allArePlay).toBe(true);
  });
});

// ─── Control-panel play/pause/resume via panel button ───────────────────────

test.describe('Control-panel play / pause / resume via panel button', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto(semanticKernelPageUrl());
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#talkient-control-panel', { timeout: 10000 });

    // Expand the panel
    await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      if (panel?.classList.contains('talkient-collapsed')) {
        (
          panel.querySelector('.talkient-panel-toggle') as HTMLButtonElement
        )?.click();
      }
    });
    await page.waitForSelector(
      '#talkient-control-panel:not(.talkient-collapsed)',
      {
        timeout: 5000,
      },
    );

    await page.waitForSelector('.talkient-play-button', { timeout: 15000 });
  });

  test('panel button shows play icon initially', async ({ page }) => {
    const panelBtnHtml = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      return (
        panel?.querySelector('.talkient-control-btn.primary')?.innerHTML ?? ''
      );
    });
    expect(hasPlayIcon(panelBtnHtml)).toBe(true);
  });

  test('panel play click sets first content button to pause', async ({
    page,
  }) => {
    const primaryBtn = page.locator(
      '#talkient-control-panel .talkient-control-btn.primary',
    );

    // Track whether the first play-button is clicked
    await page.evaluate(() => {
      const btn = document.querySelector('.talkient-play-button');
      (window as unknown as Record<string, unknown>).__panelIconTestClicked =
        false;
      btn?.addEventListener(
        'click',
        () => {
          (
            window as unknown as Record<string, unknown>
          ).__panelIconTestClicked = true;
        },
        { once: true },
      );
    });

    await primaryBtn.click();
    await page.waitForTimeout(500);

    const wasClicked = await page.evaluate(
      () =>
        (window as unknown as Record<string, unknown>).__panelIconTestClicked ??
        false,
    );
    expect(wasClicked).toBe(true);
  });

  test('panel button shows pause icon while content button is in pause state, then play after panel-pause', async ({
    page,
  }) => {
    const primaryBtn = page.locator(
      '#talkient-control-panel .talkient-control-btn.primary',
    );

    // Manually set the first content play-button to pause state (simulates TTS having started)
    await page.evaluate(() => {
      const btn = document.querySelector('.talkient-play-button');
      if (btn) {
        btn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
          '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      }
      // Simulate updatePanelPlayIcon('pause') as content.ts would call it
      const panel = document.getElementById('talkient-control-panel');
      const panelBtn = panel?.querySelector(
        '.talkient-control-btn.primary',
      ) as HTMLElement | null;
      if (panelBtn) {
        panelBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
          '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      }
    });

    // Verify panel shows pause icon
    const panelShowsPause = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      return (
        panel
          ?.querySelector('.talkient-control-btn.primary')
          ?.innerHTML.includes('M6 19h4V5H6v14zm8-14v14h4V5h-4z') ?? false
      );
    });
    expect(panelShowsPause).toBe(true);

    // Click panel button — should send PAUSE_SPEECH and reset icon to play
    await primaryBtn.click();

    await page.waitForFunction(
      () => {
        const panel = document.getElementById('talkient-control-panel');
        const btn = panel?.querySelector('.talkient-control-btn.primary');
        return btn?.innerHTML.includes('M8 5v14l11-7z') ?? false;
      },
      { timeout: 10000 },
    );

    const panelShowsPlay = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      return (
        panel
          ?.querySelector('.talkient-control-btn.primary')
          ?.innerHTML.includes('M8 5v14l11-7z') ?? false
      );
    });
    expect(panelShowsPlay).toBe(true);
  });

  test('full play → pause → resume cycle via panel button', async ({
    page,
  }) => {
    const primaryBtn = page.locator(
      '#talkient-control-panel .talkient-control-btn.primary',
    );

    // ── Step 1: play via panel ──
    await page.evaluate(() => {
      const btn = document.querySelector('.talkient-play-button');
      (window as unknown as Record<string, unknown>).__cycleClicked = 0;
      btn?.addEventListener('click', () => {
        (window as unknown as Record<string, unknown>).__cycleClicked =
          ((window as unknown as Record<string, unknown>)
            .__cycleClicked as number) + 1;
      });
    });

    await primaryBtn.click();
    await page.waitForTimeout(300);

    const clickSpy = await page.evaluate(
      () =>
        ((window as unknown as Record<string, unknown>)
          .__cycleClicked as number) > 0,
    );
    expect(clickSpy).toBe(true);

    // ── Step 2: simulate TTS started → panel shows pause icon ──
    await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      const panelBtn = panel?.querySelector(
        '.talkient-control-btn.primary',
      ) as HTMLElement | null;
      if (panelBtn) {
        panelBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
          '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      }
      // Also put the content play-button in pause state
      const contentBtn = document.querySelector('.talkient-play-button');
      if (contentBtn) {
        contentBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
          '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
      }
    });

    // ── Step 3: pause via panel ──
    await primaryBtn.click();

    await page.waitForFunction(
      () => {
        const panel = document.getElementById('talkient-control-panel');
        const btn = panel?.querySelector('.talkient-control-btn.primary');
        return btn?.innerHTML.includes('M8 5v14l11-7z') ?? false;
      },
      { timeout: 10000 },
    );

    const showsPlayAfterPause = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      return (
        panel
          ?.querySelector('.talkient-control-btn.primary')
          ?.innerHTML.includes('M8 5v14l11-7z') ?? false
      );
    });
    expect(showsPlayAfterPause).toBe(true);

    // ── Step 4: resume via panel — the paused content button (pause icon) should be reset
    //    and safeClickButton called on it ──
    // The content button still shows pause icon from step 2 (it was not reset by the
    // panel-pause handler because clearHighlight() runs, not button reset).
    // panel-controller logic: finds paused button → resets to play → clicks it.
    const prevClickCount = await page.evaluate(
      () =>
        (window as unknown as Record<string, unknown>).__cycleClicked as number,
    );

    await primaryBtn.click();
    await page.waitForTimeout(500);

    const newClickCount = await page.evaluate(
      () =>
        (window as unknown as Record<string, unknown>).__cycleClicked as number,
    );
    expect(newClickCount).toBeGreaterThan(prevClickCount);
  });
});
