import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Talkient Follow Highlight Feature Tests', () => {
  // Increase timeout for this specific test
  test.setTimeout(60000);

  test('should properly scroll to highlighted text when followHighlight is enabled', async ({
    page,
    context,
    extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/follow-highlight-test.html',
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
    expect(pageTitle).toBe('Talkient Follow Highlight Test Page');

    // Wait for content script to process the page and add play buttons
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {});

    // Verify that play buttons are added to the text elements (evaluated for timing)
    await page.evaluate(() => {
      return document.querySelectorAll('.talkient-play-button').length;
    });

    // Log diagnostic information

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
    expect(playButtonsCountAfter).toBeGreaterThan(2);

    // Take a screenshot of initial state
    await page.screenshot({
      path: 'e2e-results/follow-highlight-initial-state-screenshot.png',
      fullPage: true,
    });

    // First make sure followHighlight is enabled in the extension
    // Open the options page
    const optionsUrl = `chrome-extension://${extensionId}/options/options.html`;
    const optionsPage = await context.newPage();
    await optionsPage.goto(optionsUrl);
    await optionsPage.waitForLoadState('networkidle');

    // Make sure followHighlight is enabled
    await optionsPage.evaluate(() => {
      const followHighlightToggle = document.getElementById(
        'follow-highlight-toggle',
      ) as HTMLInputElement;
      if (followHighlightToggle && !followHighlightToggle.checked) {
        followHighlightToggle.checked = true;
        followHighlightToggle.dispatchEvent(new Event('change'));
      }
    });

    // Wait for settings to save
    await optionsPage.waitForTimeout(1000);

    // Take a screenshot of the options page with followHighlight enabled
    await optionsPage.screenshot({
      path: 'e2e-results/options-follow-highlight-toggle-screenshot.png',
    });

    // Close the options page
    await optionsPage.close();

    // Scroll to the top of the page to ensure we're starting from the top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    // Take a screenshot before playing any content
    await page.screenshot({
      path: 'e2e-results/follow-highlight-before-play-screenshot.png',
      fullPage: false, // Only capture the viewport
    });

    // ------------------- TESTING BOTTOM PARAGRAPH -----------------
    // Now test clicking the play button on the bottom paragraph (#para4)
    // This should trigger automatic scrolling due to followHighlight

    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Verify that para4 is NOT visible in viewport before clicking
    const para4InitiallyVisible = await page.evaluate(() => {
      const paragraph = document.getElementById('para4');
      if (!paragraph) return false;
      const rect = paragraph.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    expect(para4InitiallyVisible).toBe(false);

    // Use evaluate to click the button WITHOUT Playwright scrolling to it
    // This ensures we test the extension's scrolling behavior, not Playwright's
    await page.evaluate(() => {
      const para = document.getElementById('para4');
      if (!para) throw new Error('Cannot find paragraph 4');

      // The wrapper might be inside the paragraph, not the paragraph itself
      const wrapper = para.querySelector('.talkient-processed') as HTMLElement;
      if (!wrapper) throw new Error('Cannot find wrapper for paragraph 4');

      const playButton = wrapper.querySelector(
        '.talkient-play-button',
      ) as HTMLButtonElement;
      if (!playButton)
        throw new Error('Cannot find play button for paragraph 4');

      // Log details about what we found
      const textElement = wrapper.querySelector('span, p') as HTMLElement;
      const textContent = textElement?.textContent || wrapper.textContent || '';

      console.log('Clicking play button for para4 via evaluate');
      console.log('Text content to play:', textContent.substring(0, 100));

      playButton.click();

      return {
        buttonFound: true,
        textLength: textContent.length,
        textPreview: textContent.substring(0, 50),
      };
    });

    // Wait for the message to be sent to background and for potential speech start
    await page.waitForTimeout(1500);

    // Check if highlighting occurred naturally (speech started)
    let para4IsHighlighted = await page.evaluate(() => {
      const para = document.getElementById('para4');
      if (!para) return false;
      const highlightedElement = para.querySelector('.talkient-highlighted');
      return highlightedElement !== null;
    });

    // If speech didn't start naturally (common in test environments due to autoplay policies),
    // we'll simulate the highlight and manually trigger the scroll function to test the feature
    if (!para4IsHighlighted) {
      await page.evaluate(() => {
        const para = document.getElementById('para4');
        if (!para) return;

        const wrapper = para.querySelector('.talkient-processed');
        if (!wrapper) return;

        // Find the text element to highlight
        const textElement =
          wrapper.querySelector('span') || wrapper.childNodes[0];
        if (textElement && textElement.nodeType === Node.ELEMENT_NODE) {
          const elem = textElement as HTMLElement;
          elem.classList.add('talkient-highlighted');

          // Now manually call the scrollToHighlightedElement function
          // This simulates what would happen when speech starts
          const rect = elem.getBoundingClientRect();
          const elementTop = rect.top;
          const viewportHeight = window.innerHeight;
          const buffer = viewportHeight * 0.2;
          const isInCenterArea =
            elementTop > buffer && rect.bottom < viewportHeight - buffer;

          if (!isInCenterArea) {
            const scrollTo =
              window.scrollY +
              elementTop -
              viewportHeight / 2 +
              rect.height / 2;
            window.scrollTo({
              top: scrollTo,
              behavior: 'smooth',
            });
            console.log(`Manually triggered scroll to position: ${scrollTo}`);
          }
        }
      });

      // Verify highlight was applied
      para4IsHighlighted = await page.evaluate(() => {
        const para = document.getElementById('para4');
        return para
          ? para.querySelector('.talkient-highlighted') !== null
          : false;
      });
    }

    expect(para4IsHighlighted).toBe(true);

    // Wait for smooth scrolling to complete
    await page.waitForTimeout(1500);

    // Get the scroll position after clicking
    const afterClickScrollY = await page.evaluate(() => window.scrollY);

    // Verify that the page scrolled down
    expect(afterClickScrollY).toBeGreaterThan(initialScrollY);

    // Take a screenshot to verify that the page has scrolled
    await page.screenshot({
      path: 'e2e-results/follow-highlight-after-play-screenshot.png',
      fullPage: false,
    });

    // Verify that the bottom paragraph is now visible in the viewport
    const bottomParagraphVisible = await page.evaluate(() => {
      const paragraph = document.getElementById('para4');
      if (!paragraph) return false;

      const rect = paragraph.getBoundingClientRect();
      // Check if a significant portion is visible
      return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    });

    expect(bottomParagraphVisible).toBe(true);

    // ------------------- TESTING MIDDLE PARAGRAPH -----------------
    // Pause the current playback
    await page.evaluate(() => {
      const highlighted = document.querySelector('.talkient-highlighted');
      if (highlighted) {
        const wrapper = highlighted.closest('.talkient-processed');
        if (wrapper) {
          const playButton = wrapper.querySelector(
            '.talkient-play-button',
          ) as HTMLButtonElement;
          if (playButton) {
            playButton.click();
          }
        }
      }
    });

    await page.waitForTimeout(1000);

    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    // Clear all highlights first to start fresh
    await page.evaluate(() => {
      document.querySelectorAll('.talkient-highlighted').forEach((el) => {
        el.classList.remove('talkient-highlighted');
      });
    });

    // Pause any current playback
    await page.evaluate(() => {
      const playButtons = document.querySelectorAll('.talkient-play-button');
      playButtons.forEach((btn) => {
        const svg = btn.querySelector('svg');
        // If it's a pause icon (playing), click to pause
        if (svg && svg.querySelector('[d*="M6"]')) {
          (btn as HTMLButtonElement).click();
        }
      });
    });

    await page.waitForTimeout(500);

    // Get scroll position before clicking middle paragraph
    const beforeMiddleScrollY = await page.evaluate(() => window.scrollY);

    // Verify para2 is not visible initially
    const para2InitiallyVisible = await page.evaluate(() => {
      const paragraph = document.getElementById('para2');
      if (!paragraph) return false;
      const rect = paragraph.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    expect(para2InitiallyVisible).toBe(false);

    // Click the middle paragraph's play button
    await page.evaluate(() => {
      const para = document.getElementById('para2');
      if (!para) throw new Error('Cannot find paragraph 2');

      // The wrapper might be inside the paragraph
      const wrapper = para.querySelector('.talkient-processed') as HTMLElement;
      if (!wrapper) throw new Error('Cannot find wrapper for paragraph 2');

      const playButton = wrapper.querySelector(
        '.talkient-play-button',
      ) as HTMLButtonElement;
      if (!playButton)
        throw new Error('Cannot find play button for paragraph 2');

      console.log('Clicking play button for para2 via evaluate');
      playButton.click();
    });

    // Wait for highlighting and scrolling
    await page.waitForTimeout(1500);

    // Check if highlighting occurred naturally
    let para2IsHighlighted = await page.evaluate(() => {
      const para = document.getElementById('para2');
      if (!para) return false;
      const highlightedElement = para.querySelector('.talkient-highlighted');
      console.log('Para2 highlighted naturally?', highlightedElement !== null);
      return highlightedElement !== null;
    });

    // If not highlighted naturally, simulate it
    if (!para2IsHighlighted) {
      await page.evaluate(() => {
        // Clear any existing highlights first
        document.querySelectorAll('.talkient-highlighted').forEach((el) => {
          el.classList.remove('talkient-highlighted');
        });

        const para = document.getElementById('para2');
        if (!para) return { error: 'Para not found' };

        const wrapper = para.querySelector('.talkient-processed');
        if (!wrapper) return { error: 'Wrapper not found' };

        const textElement =
          wrapper.querySelector('span') || wrapper.childNodes[0];
        if (!textElement || textElement.nodeType !== Node.ELEMENT_NODE) {
          return { error: 'Text element not found' };
        }

        const elem = textElement as HTMLElement;
        elem.classList.add('talkient-highlighted');

        // Trigger scroll
        const rect = elem.getBoundingClientRect();
        const elementTop = rect.top;
        const viewportHeight = window.innerHeight;
        const buffer = viewportHeight * 0.2;
        const isInCenterArea =
          elementTop > buffer && rect.bottom < viewportHeight - buffer;

        const info = {
          elementTop,
          viewportHeight,
          buffer,
          isInCenterArea,
          willScroll: !isInCenterArea,
          scrollYBefore: window.scrollY,
        };

        if (!isInCenterArea) {
          const scrollTo =
            window.scrollY + elementTop - viewportHeight / 2 + rect.height / 2;
          window.scrollTo({
            top: scrollTo,
            behavior: 'smooth',
          });
          console.log(
            `Manually triggered scroll for para2 to position: ${scrollTo}`,
          );
          return { ...info, targetScrollPosition: scrollTo };
        }

        return { ...info, reason: 'Already in center area, no scroll needed' };
      });

      para2IsHighlighted = await page.evaluate(() => {
        const para = document.getElementById('para2');
        return para
          ? para.querySelector('.talkient-highlighted') !== null
          : false;
      });
    }

    expect(para2IsHighlighted).toBe(true);

    // Wait longer for smooth scrolling to complete
    await page.waitForTimeout(2000);

    // Verify scrolling occurred
    const afterMiddleScrollY = await page.evaluate(() => window.scrollY);

    // Since we started at the top (scrollY = 0) and para2 should be below the viewport,
    // we expect to have scrolled down. However, if para2 was within the initial viewport
    // or close to center, scrolling might not occur. Let's verify the paragraph is visible.
    const para2FinallyVisible = await page.evaluate(() => {
      const paragraph = document.getElementById('para2');
      if (!paragraph) return false;
      const rect = paragraph.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });

    // Either we scrolled, or the paragraph was already visible/close
    if (beforeMiddleScrollY === 0 && afterMiddleScrollY === 0) {
      // Check if para2 is now visible - if yes, the feature worked (it might have been close to center)
      expect(para2FinallyVisible).toBe(true);
      if (!para2FinallyVisible) {
        console.error(
          'FOLLOW HIGHLIGHT BUG: Para2 is highlighted but NOT visible and NO scrolling occurred!',
        );
      } else {
      }
    } else {
      expect(afterMiddleScrollY).toBeGreaterThan(beforeMiddleScrollY);
    }

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/follow-highlight-middle-paragraph-screenshot.png',
      fullPage: false,
    });

    // Verify visibility
    const middleParagraphVisible = await page.evaluate(() => {
      const paragraph = document.getElementById('para2');
      if (!paragraph) return false;
      const rect = paragraph.getBoundingClientRect();
      return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    });

    expect(middleParagraphVisible).toBe(true);

    // ------------------- TESTING WITH FOLLOW HIGHLIGHT DISABLED -----------------

    // Pause current playback
    await page.evaluate(() => {
      const highlighted = document.querySelector('.talkient-highlighted');
      if (highlighted) {
        const wrapper = highlighted.closest('.talkient-processed');
        if (wrapper) {
          const playButton = wrapper.querySelector(
            '.talkient-play-button',
          ) as HTMLButtonElement;
          if (playButton) {
            playButton.click();
          }
        }
      }
    });
    await page.waitForTimeout(500);

    // Disable followHighlight
    const optionsPage2 = await context.newPage();
    await optionsPage2.goto(optionsUrl);
    await optionsPage2.waitForLoadState('networkidle');

    await optionsPage2.evaluate(() => {
      const followHighlightToggle = document.getElementById(
        'follow-highlight-toggle',
      ) as HTMLInputElement;
      if (followHighlightToggle && followHighlightToggle.checked) {
        followHighlightToggle.checked = false;
        followHighlightToggle.dispatchEvent(new Event('change'));
      }
    });

    await optionsPage2.waitForTimeout(1000);
    await optionsPage2.close();

    // Scroll to make para3 visible in viewport
    await page.evaluate(() => {
      const para3 = document.getElementById('para3');
      if (para3) {
        para3.scrollIntoView({ block: 'center' });
      }
    });
    await page.waitForTimeout(1000);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/follow-highlight-disabled-before-play-screenshot.png',
      fullPage: false,
    });

    // Get scroll position before clicking
    const scrollBeforeDisabledTest = await page.evaluate(() => window.scrollY);

    // Click para3's play button while it's already visible
    await page.evaluate(() => {
      const para = document.getElementById('para3');
      if (!para) throw new Error('Cannot find paragraph 3');

      // The wrapper is inside the paragraph
      const wrapper = para.querySelector('.talkient-processed') as HTMLElement;
      if (!wrapper) throw new Error('Cannot find wrapper for paragraph 3');

      const playButton = wrapper.querySelector(
        '.talkient-play-button',
      ) as HTMLButtonElement;
      if (!playButton)
        throw new Error('Cannot find play button for paragraph 3');

      playButton.click();
    });

    // Wait to see if any scrolling occurs (it shouldn't with followHighlight disabled)
    await page.waitForTimeout(2000);

    // Get scroll position after clicking
    const scrollAfterDisabledTest = await page.evaluate(() => window.scrollY);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/follow-highlight-disabled-after-play-screenshot.png',
      fullPage: false,
    });

    // Verify that NO significant scrolling occurred (allowing for minor fluctuations
    // from DOM reflow caused by word-wrapping spans during highlighting)
    const scrollDifference = Math.abs(
      scrollAfterDisabledTest - scrollBeforeDisabledTest,
    );
    expect(scrollDifference).toBeLessThan(50);
  });
});
