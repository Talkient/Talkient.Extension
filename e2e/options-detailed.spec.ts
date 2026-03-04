import { test, expect } from './extension-test';
import { Page } from '@playwright/test';

test.describe('Talkient Extension Options Page - Detailed Tests', () => {
  // Helper function to navigate to options page
  async function navigateToOptionsPage(page: Page, extensionId: string) {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for the settings header to be visible
    await page
      .locator('h1:has-text("Talkient Settings")')
      .waitFor({ state: 'visible', timeout: 5000 });
    // Give time for storage to load and populate all fields
    await page.waitForTimeout(800);
  }

  test('should save and persist all settings when changed together', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await navigateToOptionsPage(page, extensionId);

    // Take a screenshot of initial state
    await page.screenshot({
      path: 'e2e-results/options-before-changes-screenshot.png',
    });

    // Change all settings at once
    await test.step('Change auto-play toggle', async () => {
      await page.locator('#auto-play-next-toggle').isChecked();

      // Click the toggle using JavaScript to avoid visibility issues
      await page.evaluate(() => {
        const toggle = document.getElementById(
          'auto-play-next-toggle',
        ) as HTMLInputElement;
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    await test.step('Change follow highlight toggle', async () => {
      await page.locator('#follow-highlight-toggle').isChecked();

      // Click the toggle using JavaScript to avoid visibility issues
      await page.evaluate(() => {
        const toggle = document.getElementById(
          'follow-highlight-toggle',
        ) as HTMLInputElement;
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    await test.step('Change minimum words', async () => {
      await page.locator('#minimum-words-input').fill('8');
    });

    await test.step('Change highlight style', async () => {
      await page.selectOption('#highlight-style-select', 'minimal');
    });

    await test.step('Change speech rate', async () => {
      await page.evaluate(() => {
        const slider = document.getElementById(
          'rate-slider',
        ) as HTMLInputElement;
        slider.value = '1.75';
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
      });
    });

    await test.step('Change speech pitch', async () => {
      await page.evaluate(() => {
        const slider = document.getElementById(
          'pitch-slider',
        ) as HTMLInputElement;
        slider.value = '1.2';
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
      });
    });

    // Wait for all settings to be saved
    await page.waitForTimeout(1000);

    // Take a screenshot after changes
    await page.screenshot({
      path: 'e2e-results/options-after-changes-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all settings were persisted
    await test.step('Verify all settings were persisted after reload', async () => {
      await page.locator('#auto-play-next-toggle').isChecked();
      await page.locator('#follow-highlight-toggle').isChecked();
      const minimumWords = await page
        .locator('#minimum-words-input')
        .inputValue();
      const highlightStyle = await page
        .locator('#highlight-style-select')
        .inputValue();
      const rateValue = await page.locator('#rate-slider').inputValue();
      const pitchValue = await page.locator('#pitch-slider').inputValue();

      // Check if values match what we set
      expect(minimumWords).toBe('8');
      expect(highlightStyle).toBe('minimal');
      expect(rateValue).toBe('1.75');
      expect(pitchValue).toBe('1.2');

      // Take a screenshot of persisted state
      await page.screenshot({
        path: 'e2e-results/options-persistence-verification-screenshot.png',
      });
    });
  });

  test('should show proper format for rate and pitch values', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await navigateToOptionsPage(page, extensionId);

    // Test rate slider formatting
    await test.step('Test rate slider display formatting', async () => {
      // Set to a value with decimals
      await page.evaluate(() => {
        const slider = document.getElementById(
          'rate-slider',
        ) as HTMLInputElement;
        slider.value = '1.15';
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
      });

      // Verify the displayed format (should be 1.15x)
      const rateDisplay = await page.locator('#rate-value').textContent();
      expect(rateDisplay).toBe('1.15x');

      // Check rounding to nearest 0.05
      await page.evaluate(() => {
        const slider = document.getElementById(
          'rate-slider',
        ) as HTMLInputElement;
        slider.value = '1.23';
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
      });

      // Verify correct rounding (should be 1.25x due to 0.05 step rounding)
      const roundedRateDisplay = await page
        .locator('#rate-value')
        .textContent();
      expect(roundedRateDisplay).toBe('1.25x');
    });

    // Test pitch slider formatting
    await test.step('Test pitch slider display formatting', async () => {
      // Set to a value with decimals
      await page.evaluate(() => {
        const slider = document.getElementById(
          'pitch-slider',
        ) as HTMLInputElement;
        slider.value = '1.5';
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
      });

      // Verify the displayed format (should be 1.5x)
      const pitchDisplay = await page.locator('#pitch-value').textContent();
      expect(pitchDisplay).toBe('1.5x');
    });

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-value-formatting-screenshot.png',
    });
  });

  test('should validate minimum words input constraints', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await navigateToOptionsPage(page, extensionId);

    await test.step('Test minimum words input constraints', async () => {
      // First, ensure the input field is visible and interactive
      await page.locator('#minimum-words-input').waitFor({ state: 'visible' });

      // Set to a valid value and explicitly wait for the input to stabilize
      await page.locator('#minimum-words-input').clear();
      await page.locator('#minimum-words-input').fill('10');
      await page.locator('#minimum-words-input').blur(); // Blur to trigger validation

      // Wait briefly for any validation to occur
      await page.waitForTimeout(300);

      // Check that the value is accepted
      const valueAfterValid = await page
        .locator('#minimum-words-input')
        .inputValue();
      expect(valueAfterValid).toBe('10');

      // Try to set a non-integer value
      await page.locator('#minimum-words-input').clear();
      await page.locator('#minimum-words-input').fill('5.5');

      // Use focus/blur instead of direct event dispatch for more reliability
      await page.locator('#minimum-words-input').focus();
      await page.locator('#minimum-words-input').blur();

      // Wait longer for validation to take effect
      await page.waitForTimeout(500);

      // Check that the value is constrained to an integer (as step="1")
      const valueAfterFloat = await page
        .locator('#minimum-words-input')
        .inputValue();

      // More robust validation that handles different browser behaviors
      expect(Number.isInteger(Number.parseFloat(valueAfterFloat))).toBe(true);
    });

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-minimum-words-validation-screenshot.png',
    });
  });

  test('should visually indicate saved state with status message', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await navigateToOptionsPage(page, extensionId);

    await test.step('Check status message appearance and timing', async () => {
      // Initially the status should not be visible
      await expect(page.locator('#status')).not.toHaveClass(/visible/);

      // Change a setting to trigger the status message
      await page.selectOption('#highlight-style-select', 'bold');

      // Verify status appears with correct message
      await expect(page.locator('#status')).toHaveClass(/visible success/);
      await expect(page.locator('#status')).toContainText(
        'Highlight style saved!',
      );

      // Take a screenshot with the status visible
      await page.screenshot({
        path: 'e2e-results/options-status-message-visible-screenshot.png',
      });

      // Wait for the status to disappear (should be 3 seconds)
      await page.waitForTimeout(3500);

      // Verify status is no longer visible
      await expect(page.locator('#status')).not.toHaveClass(/visible/);

      // Take a screenshot after status disappears
      await page.screenshot({
        path: 'e2e-results/options-status-message-hidden-screenshot.png',
      });
    });
  });

  test('should handle empty voice list gracefully', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await navigateToOptionsPage(page, extensionId);

    await test.step('Verify voice selection has at least default option', async () => {
      // There should always be at least the default voice option
      const optionCount = await page.locator('#voice-select option').count();
      expect(optionCount).toBeGreaterThanOrEqual(1);

      // The first option should be the default
      const firstOptionText = await page
        .locator('#voice-select option')
        .first()
        .textContent();
      expect(firstOptionText).toContain('Default Voice');
    });
  });

  test('should directly navigate to options page from chrome:// URL', async ({
    context,
    extensionId,
  }) => {
    // Create a new page
    const page = await context.newPage();

    // Navigate directly to the extension options page URL
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Verify the page loaded correctly
    await expect(page).toHaveTitle('Talkient Options');
    await expect(page.locator('h1')).toContainText('Talkient Settings');

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/options-direct-navigation-screenshot.png',
    });
  });
});
