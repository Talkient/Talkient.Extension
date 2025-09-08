import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Talkient Complex Play-Pause-Resume Functionality Tests', () => {
  // Increase timeout for this complex test
  test.setTimeout(120000);

  test('should test complex play-pause-resume scenarios with interruption verification', async ({
    page,
    context,
    extensionId,
  }) => {
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

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check that the page title is as expected
    const pageTitle = await page.title();
    expect(pageTitle).toBe('Talkient Play-Pause Test Page');

    console.log(`Complex test page loaded: "${pageTitle}"`);

    // Force content script to process the page by triggering reprocessing
    await page.evaluate(() => {
      // Create and dispatch a custom event to trigger reprocessing
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);

      // Also create a dummy element and remove it to trigger mutation observer
      const dummyElem = document.createElement('div');
      dummyElem.id = 'talkient-mutation-trigger';
      document.body.appendChild(dummyElem);
      setTimeout(() => dummyElem.remove(), 500);
    });

    // Wait for play buttons to appear after reprocessing
    await page.waitForSelector('.talkient-play-button', { timeout: 15000 });

    // Verify sufficient play buttons exist
    const playButtonsCount = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    console.log(`Found ${playButtonsCount} play buttons for complex testing`);
    expect(playButtonsCount).toBeGreaterThan(5);

    // Take initial screenshot
    await page.screenshot({
      path: 'e2e-results/complex-play-pause-initial-state-screenshot.png',
    });

    // Helper function to click play button for specific paragraph
    const clickPlayButton = async (paragraphId: string) => {
      return await page.evaluate(async (id) => {
        try {
          const para = document.getElementById(id);
          const button = para?.querySelector(
            '.talkient-play-button'
          ) as HTMLButtonElement;
          if (button) {
            // Add delay for stability
            await new Promise((resolve) => setTimeout(resolve, 300));
            button.click();
            return true;
          }
          return false;
        } catch (err) {
          console.error(`Error clicking button for ${id}:`, err);
          return false;
        }
      }, paragraphId);
    };

    // Debug helper to see button states
    const debugButtonStates = async () => {
      return await page.evaluate(() => {
        const allButtons = document.querySelectorAll('.talkient-play-button');
        return Array.from(allButtons).map((btn, index) => {
          const parent = btn.closest('[id]');
          return {
            index,
            parentId: parent?.id,
            text: btn.textContent?.trim(),
            classes: Array.from(btn.classList),
          };
        });
      });
    };

    console.log('Initial button states:', await debugButtonStates());

    // PHASE 1: Play text1 (para1)
    console.log('PHASE 1: Starting to play paragraph 1 (text1)');

    const text1PlayResult = await clickPlayButton('para1');
    expect(text1PlayResult).toBeTruthy();
    await page.waitForTimeout(2000);

    console.log('Phase 1 button states:', await debugButtonStates());
    await page.screenshot({
      path: 'e2e-results/complex-phase1-text1-playing-screenshot.png',
    });

    // PHASE 2: Play text2 (para2) to interrupt text1
    console.log('PHASE 2: Playing paragraph 2 (text2) to interrupt text1');

    const text2PlayResult = await clickPlayButton('para2');
    expect(text2PlayResult).toBeTruthy();
    await page.waitForTimeout(2000);

    console.log(
      'Phase 2 button states after interruption:',
      await debugButtonStates()
    );
    await page.screenshot({
      path: 'e2e-results/complex-phase2-text1-interrupted-text2-playing-screenshot.png',
    });

    // PHASE 3: Pause text2 by clicking it again
    console.log('PHASE 3: Pausing paragraph 2 (text2)');

    const text2PauseResult = await clickPlayButton('para2');
    expect(text2PauseResult).toBeTruthy();
    await page.waitForTimeout(1500);

    console.log(
      'Phase 3 button states after pause:',
      await debugButtonStates()
    );
    await page.screenshot({
      path: 'e2e-results/complex-phase3-text2-paused-screenshot.png',
    });

    // PHASE 4: Resume text2 by clicking it again
    console.log('PHASE 4: Resuming paragraph 2 (text2)');

    const text2ResumeResult = await clickPlayButton('para2');
    expect(text2ResumeResult).toBeTruthy();
    await page.waitForTimeout(2000);

    console.log(
      'Phase 4 button states after resume:',
      await debugButtonStates()
    );
    await page.screenshot({
      path: 'e2e-results/complex-phase4-text2-resumed-screenshot.png',
    });

    // PHASE 5: Play text3 (para3) to interrupt text2
    console.log('PHASE 5: Playing paragraph 3 (text3) to interrupt text2');

    const text3PlayResult = await clickPlayButton('para3');
    expect(text3PlayResult).toBeTruthy();
    await page.waitForTimeout(2000);

    console.log(
      'Phase 5 button states after text3 started:',
      await debugButtonStates()
    );
    await page.screenshot({
      path: 'e2e-results/complex-phase5-text2-interrupted-text3-playing-screenshot.png',
    });

    // PHASE 6: Pause text3
    console.log('PHASE 6: Pausing paragraph 3 (text3)');

    const text3PauseResult = await clickPlayButton('para3');
    expect(text3PauseResult).toBeTruthy();
    await page.waitForTimeout(1500);

    console.log(
      'Phase 6 button states after text3 pause:',
      await debugButtonStates()
    );
    await page.screenshot({
      path: 'e2e-results/complex-phase6-text3-paused-screenshot.png',
    });

    // PHASE 7: Resume text3
    console.log('PHASE 7: Resuming paragraph 3 (text3)');

    const text3ResumeResult = await clickPlayButton('para3');
    expect(text3ResumeResult).toBeTruthy();
    await page.waitForTimeout(2000);

    console.log(
      'Phase 7 button states after text3 resume:',
      await debugButtonStates()
    );
    await page.screenshot({
      path: 'e2e-results/complex-phase7-text3-resumed-screenshot.png',
    });

    // PHASE 8: Test rapid interruptions
    console.log(
      'PHASE 8: Testing rapid interruptions with multiple paragraphs'
    );

    const rapidInterruptSequence = ['para4', 'para5', 'para6', 'para7'];

    for (let i = 0; i < rapidInterruptSequence.length; i++) {
      const paraId = rapidInterruptSequence[i];
      console.log(`Rapid interrupt ${i + 1}: Playing ${paraId}`);

      const playResult = await clickPlayButton(paraId);
      expect(playResult).toBeTruthy();

      // Short wait to let each one start before next interruption
      await page.waitForTimeout(800);

      // Take screenshot of each rapid interrupt step
      await page.screenshot({
        path: `e2e-results/complex-phase8-rapid-interrupt-${i + 1}-${paraId}-screenshot.png`,
      });
    }

    console.log(
      'Phase 8 final button states after rapid interruptions:',
      await debugButtonStates()
    );

    // PHASE 9: Test control panel integration if available
    console.log('PHASE 9: Testing control panel integration');

    const controlPanelExists = await page
      .waitForSelector('#talkient-control-panel', {
        state: 'attached',
        timeout: 5000,
      })
      .then(() => true)
      .catch(() => false);

    if (controlPanelExists) {
      console.log('Control panel found, testing integration');

      // Expand control panel if collapsed
      await page.evaluate(async () => {
        try {
          const panel = document.getElementById('talkient-control-panel');
          if (panel && panel.classList.contains('talkient-collapsed')) {
            const toggleButton = panel.querySelector('.talkient-panel-toggle');
            if (toggleButton) {
              await new Promise((resolve) => setTimeout(resolve, 300));
              (toggleButton as HTMLButtonElement).click();
            }
          }
        } catch (err) {
          console.error('Error expanding control panel:', err);
        }
      });

      await page.waitForTimeout(1000);

      // Start playing a paragraph
      await clickPlayButton('para8');
      await page.waitForTimeout(2000);

      // Try using stop button from control panel
      const stopButtonClicked = await page
        .waitForSelector('.talkient-stop-button', {
          state: 'attached',
          timeout: 3000,
        })
        .then(async (stopButton) => {
          if (stopButton) {
            await stopButton.click();
            return true;
          }
          return false;
        })
        .catch(() => false);

      if (stopButtonClicked) {
        console.log('Successfully used stop button from control panel');
      }

      await page.screenshot({
        path: 'e2e-results/complex-phase9-control-panel-integration-screenshot.png',
      });
    }

    // PHASE 10: Final verification
    console.log('PHASE 10: Final verification');

    console.log('Final button states:', await debugButtonStates());

    // Take final screenshot
    await page.screenshot({
      path: 'e2e-results/complex-final-state-screenshot.png',
    });
  });
});
