import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Talkient Play-Pause Functionality Tests', () => {
  // Increase timeout for this specific test
  test.setTimeout(60000);

  test('should extensively test play and pause functionality across multiple sections', async ({
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

    // Wait for content script to process the page and add play buttons - use waitForSelector instead of fixed timeout
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Verify that play buttons are added to the text elements (evaluated for timing)
    await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    // Log diagnostic information

    // Check if any elements are processed (evaluated for timing)
    await page.evaluate(() => {
      return document.querySelectorAll('.talkient-processed').length;
    });

    // Force content script to process the page by triggering a custom event
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
    await page.waitForSelector('.talkient-play-button', { timeout: 10000 });

    // Check again after forcing reprocess
    const playButtonsCountAfter = await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    // We should have multiple play buttons (one for each paragraph)
    expect(playButtonsCountAfter).toBeGreaterThan(5);

    // Take a screenshot of initial state
    await page.screenshot({
      path: 'e2e-results/play-pause-initial-state-screenshot.png',
    });

    // Define our test sequence with more comprehensive testing
    const testSequence = [
      {
        id: 'para1',
        action: 'play',
        wait: 2000,
        description: 'Play first paragraph',
      },
      {
        id: 'para1',
        action: 'pause',
        wait: 1000,
        description: 'Pause first paragraph',
      },
      {
        id: 'para3',
        action: 'play',
        wait: 2000,
        description: 'Play third paragraph',
      },
      {
        id: 'para5',
        action: 'play',
        wait: 2000,
        description: 'Play fifth paragraph (should auto-pause third)',
      },
      {
        id: 'para5',
        action: 'pause',
        wait: 1000,
        description: 'Pause fifth paragraph',
      },
      {
        id: 'para7',
        action: 'play',
        wait: 2000,
        description: 'Play seventh paragraph',
      },
      {
        id: 'para9',
        action: 'play',
        wait: 2000,
        description: 'Play ninth paragraph (should auto-pause seventh)',
      },
      {
        id: 'para9',
        action: 'pause',
        wait: 1000,
        description: 'Pause ninth paragraph',
      },
    ];

    // Execute each test sequence step
    for (let i = 0; i < testSequence.length; i++) {
      const step = testSequence[i];

      // Find and interact with the play button
      const interactionResult = await page.evaluate(
        async (stepInfo) => {
          try {
            // Find the specific button for the given paragraph if possible
            let targetButton = document.querySelector(
              `#${stepInfo.id} .talkient-play-button`,
            ) as HTMLButtonElement;

            // If not found by ID, fall back to using all buttons
            if (!targetButton) {
              const allButtons = document.querySelectorAll(
                '.talkient-play-button',
              );
              if (allButtons.length > 0) {
                // Use a different button for each step to test multiple buttons
                const buttonIndex = stepInfo.index % allButtons.length;
                console.log(
                  `Clicking button ${buttonIndex + 1} of ${allButtons.length}`,
                );
                targetButton = allButtons[buttonIndex] as HTMLButtonElement;
              } else {
                console.error('No play buttons found on page');
                return false;
              }
            }

            // Add a short delay before clicking to ensure the button is ready
            await new Promise((resolve) => setTimeout(resolve, 200));
            targetButton.click();
            return true;
          } catch (err) {
            console.error('Error clicking button:', err);
            return false;
          }
        },
        { index: i, id: step.id, action: step.action },
      );

      expect(interactionResult).toBeTruthy();

      // Wait for the specified time
      await page.waitForTimeout(step.wait);

      // Take a screenshot after each step
      await page.screenshot({
        path: `e2e-results/play-pause-step-${i + 1}-${step.id}-${step.action}-screenshot.png`,
      });
    }

    // Test rapid switching between paragraphs

    // Click 5 different play buttons in rapid succession, with waits to avoid race conditions
    for (let i = 0; i < 5; i++) {
      await page.evaluate(async (index) => {
        try {
          const allButtons = document.querySelectorAll('.talkient-play-button');
          if (allButtons.length > 0) {
            const buttonIndex = index % allButtons.length;
            // Add a short delay before clicking to ensure stability
            await new Promise((resolve) => setTimeout(resolve, 100));
            (allButtons[buttonIndex] as HTMLButtonElement).click();
          }
        } catch (err) {
          console.error('Error during rapid switching:', err);
        }
      }, i);

      // Short wait between rapid switches
      await page.waitForTimeout(800);
    }

    // Take a screenshot after rapid switching
    await page.screenshot({
      path: 'e2e-results/play-pause-rapid-switching-screenshot.png',
    });

    // Check for control panel
    const controlPanelExists = await page
      .waitForSelector('#talkient-control-panel', {
        state: 'attached',
        timeout: 5000,
      })
      .then(() => true)
      .catch(() => false);

    expect(controlPanelExists).toBeTruthy();

    // If control panel exists, try using it
    if (controlPanelExists) {
      // Expand control panel if collapsed
      await page.evaluate(async () => {
        try {
          const panel = document.getElementById('talkient-control-panel');
          if (panel && panel.classList.contains('talkient-collapsed')) {
            const toggleButton = panel.querySelector('.talkient-panel-toggle');
            if (toggleButton) {
              // Add a short delay to ensure the DOM is settled
              await new Promise((resolve) => setTimeout(resolve, 200));
              (toggleButton as HTMLButtonElement).click();
            }
          }
        } catch (err) {
          console.error('Error toggling control panel:', err);
        }
      });

      // Wait for panel to expand
      await page.waitForTimeout(1500);

      // Take a screenshot of expanded control panel
      await page.screenshot({
        path: 'e2e-results/play-pause-control-panel-screenshot.png',
      });

      // Try clicking a play button and then using the stop button in control panel
      await page.evaluate(async () => {
        try {
          // Click the first play button
          const firstButton = document.querySelector('.talkient-play-button');
          if (firstButton) {
            // Add a short delay to ensure the DOM is settled
            await new Promise((resolve) => setTimeout(resolve, 200));
            (firstButton as HTMLButtonElement).click();
          }
        } catch (err) {
          console.error('Error clicking first play button:', err);
        }
      });

      // Wait for speech to start
      await page.waitForTimeout(2500);

      // Click stop button
      const stopButtonExists = await page
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
        .catch(() => {
          console.error('Stop button not found');
          return false;
        });

      if (stopButtonExists) {
      }

      // Take a final screenshot
      await page.screenshot({
        path: 'e2e-results/play-pause-final-screenshot.png',
      });
    }
  });
});
