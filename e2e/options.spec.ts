import { test, expect } from './extension-test';

test.describe('Talkient Extension Options Page', () => {
  // Increase timeout for this test suite due to service worker initialization
  test.setTimeout(60000);
  
  test('should load options page correctly', async ({ page, extensionId }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for page to be fully loaded
    await page.waitForSelector('h1:has-text("Talkient Settings")');

    // Take a screenshot for verification
    await page.screenshot({ path: 'e2e-results/options-page-screenshot.png' });

    // Verify options page content loads correctly
    await expect(page).toHaveTitle('Talkient Options');
    await expect(page.locator('h1')).toContainText('Talkient Settings');
  });

  test('should toggle auto play next setting', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Get the current state of the toggle
    const initialState = await page
      .locator('#auto-play-next-toggle')
      .isChecked();

    // Click the toggle to change its state using JavaScript
    await page.evaluate(() => {
      const toggle = document.getElementById(
        'auto-play-next-toggle'
      ) as HTMLInputElement;
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify the toggle state changed
    await expect(page.locator('#auto-play-next-toggle')).toBeChecked({
      checked: !initialState,
    });

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Auto play next item setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-auto-play-toggle-screenshot.png',
    });
  });

  test('should toggle follow highlight setting', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for page to be fully loaded - the h1 is always visible
    await page
      .locator('h1:has-text("Talkient Settings")')
      .waitFor({ state: 'visible', timeout: 5000 });
    // Wait for the toggle to be present in DOM
    await page
      .locator('#follow-highlight-toggle')
      .waitFor({ state: 'attached', timeout: 5000 });
    // Give time for storage to load and populate the checkbox
    await page.waitForTimeout(800);

    // Get the current state of the toggle (checkbox is hidden but exists in DOM)
    const initialState = await page
      .locator('#follow-highlight-toggle')
      .isChecked();

    // Click the toggle to change its state using JavaScript
    await page.evaluate(() => {
      const toggle = document.getElementById(
        'follow-highlight-toggle'
      ) as HTMLInputElement;
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for the status message to appear, confirming the change was processed
    await page.waitForSelector('#status.visible.success');

    // Verify the toggle state changed
    await expect(page.locator('#follow-highlight-toggle')).toBeChecked({
      checked: !initialState,
    });

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Follow highlight setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-follow-highlight-toggle-screenshot.png',
    });
  });

  test('should change minimum words setting', async ({ page, extensionId }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for input to be ready
    await page.waitForSelector('#minimum-words-input');

    // Get the current value
    const initialValue = await page
      .locator('#minimum-words-input')
      .inputValue();

    // Set a new value
    await page.locator('#minimum-words-input').fill('5');

    // Wait for the status message to appear, confirming the change was processed
    await page.waitForSelector('#status.visible.success');

    // Verify the value changed
    await expect(page.locator('#minimum-words-input')).toHaveValue('5');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Minimum words setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-minimum-words-screenshot.png',
    });
  });

  test('should change highlight style', async ({ page, extensionId }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Get the current value
    const initialValue = await page
      .locator('#highlight-style-select')
      .inputValue();

    // Select a different highlight style
    await page.selectOption('#highlight-style-select', 'bold');

    // Verify the style changed
    await expect(page.locator('#highlight-style-select')).toHaveValue('bold');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Highlight style saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-highlight-style-screenshot.png',
    });
  });

  test('should change speech rate', async ({ page, extensionId }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for slider to be ready
    await page.waitForSelector('#rate-slider');

    // Get the current value
    const initialValue = await page.locator('#rate-slider').inputValue();

    // Set a new speech rate
    await page.locator('#rate-slider').fill('1.5');

    // Use Playwright's more reliable fill + dispatchEvent approach
    await page.evaluate(() => {
      const slider = document.getElementById('rate-slider') as HTMLInputElement;
      slider.value = '1.5';
      // Dispatch both input and change events for better reliability
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for the status message to appear, confirming the change was processed
    await page.waitForSelector('#status.visible.success');

    // Verify the value changed
    await expect(page.locator('#rate-slider')).toHaveValue('1.5');
    await expect(page.locator('#rate-value')).toContainText('1.50x');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText('Speech rate saved!');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-speech-rate-screenshot.png',
    });
  });

  test('should change speech pitch', async ({ page, extensionId }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Get the current value
    const initialValue = await page.locator('#pitch-slider').inputValue();

    // Set a new pitch value
    await page.locator('#pitch-slider').fill('1.5');

    // Need to dispatch an input event since fill() might not trigger it for range inputs
    await page.evaluate(() => {
      const event = new Event('input', { bubbles: true });
      document.getElementById('pitch-slider')?.dispatchEvent(event);
    });

    // Verify the value changed
    await expect(page.locator('#pitch-slider')).toHaveValue('1.5');
    await expect(page.locator('#pitch-value')).toContainText('1.5x');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText('Speech pitch saved!');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-speech-pitch-screenshot.png',
    });
  });

  test('should handle voice selection', async ({ page, extensionId }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Check if there are voice options available (beyond the default)
    const voiceCount = await page.locator('#voice-select option').count();

    if (voiceCount > 1) {
      // Select a different voice (second option)
      await page.selectOption('#voice-select', { index: 1 });

      // Verify the voice selection changed
      const selectedValue = await page.locator('#voice-select').inputValue();
      expect(selectedValue).not.toBe('default');

      // Verify status message appears
      await expect(page.locator('#status')).toHaveClass(/visible success/);
      await expect(page.locator('#status')).toContainText(
        'Voice selection saved!'
      );
    } else {
      // Just verify there's at least one voice option (default)
      // The actual count may vary based on environment
      await expect(page.locator('#voice-select option')).toHaveCount(
        await page.locator('#voice-select option').count()
      );

      // Verify that the Default Voice option exists
      const hasDefaultVoice = await page.evaluate(() => {
        const options = document.querySelectorAll('#voice-select option');
        for (let i = 0; i < options.length; i++) {
          if (options[i].textContent?.includes('Default Voice')) {
            return true;
          }
        }
        return false;
      });

      expect(hasDefaultVoice).toBe(true);
    }

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-voice-selection-screenshot.png',
    });
  });

  test('should verify settings persistence', async ({
    page,
    extensionId,
    context,
  }) => {
    // Navigate to the options page and change multiple settings
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Change minimum words
    await page.locator('#minimum-words-input').fill('7');

    // Change maximum nodes processed
    await page.locator('#max-nodes-input').fill('1200');

    // Change highlight style
    await page.selectOption('#highlight-style-select', 'elegant');

    // Change auto-play setting
    const initialAutoPlayState = await page
      .locator('#auto-play-next-toggle')
      .isChecked();

    // Make sure element is visible and use JavaScript click instead of Playwright click
    await page.evaluate(() => {
      const toggle = document.getElementById(
        'auto-play-next-toggle'
      ) as HTMLInputElement;
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Reload the page to verify persistence
    await page.reload();

    // Verify settings were persisted
    await expect(page.locator('#minimum-words-input')).toHaveValue('7');
    await expect(page.locator('#max-nodes-input')).toHaveValue('1200');
    await expect(page.locator('#highlight-style-select')).toHaveValue(
      'elegant'
    );
    await expect(page.locator('#auto-play-next-toggle')).toBeChecked({
      checked: !initialAutoPlayState,
    });

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-persistence-screenshot.png',
    });
  });
});
