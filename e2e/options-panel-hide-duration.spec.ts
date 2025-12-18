import { test, expect } from './extension-test';

test.describe('Panel Hide Duration Configuration', () => {
  test('should change panel hide duration setting', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Verify the input exists
    await expect(page.locator('#panel-hide-duration-input')).toBeVisible();

    // Get the initial value (should be default of 30)
    const initialValue = await page
      .locator('#panel-hide-duration-input')
      .inputValue();
    expect(initialValue).toBe('30');

    // Set a new value
    await page.locator('#panel-hide-duration-input').fill('60');

    // Verify the value changed
    await expect(page.locator('#panel-hide-duration-input')).toHaveValue('60');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Panel hide duration setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-panel-hide-duration-screenshot.png',
    });
  });

  test('should validate negative value for panel hide duration', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Try to set a negative value (should be corrected to 0)
    await page.locator('#panel-hide-duration-input').fill('-10');

    // Change focus to trigger validation
    await page.locator('#minimum-words-input').click();

    // Verify the value was corrected to 0
    await expect(page.locator('#panel-hide-duration-input')).toHaveValue('0');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Panel hide duration setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-panel-hide-duration-validation-screenshot.png',
    });
  });

  test('should clamp value exceeding 9999 to maximum', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Try to set a value exceeding maximum
    await page.locator('#panel-hide-duration-input').fill('10000');

    // Change focus to trigger validation
    await page.locator('#minimum-words-input').click();

    // Verify the value was corrected to 9999
    await expect(page.locator('#panel-hide-duration-input')).toHaveValue(
      '9999'
    );

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Panel hide duration setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-panel-hide-duration-max-clamp-screenshot.png',
    });
  });

  test('should verify panel hide duration setting persistence', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Change the panel hide duration setting
    await page.locator('#panel-hide-duration-input').fill('120');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Take a before screenshot
    await page.screenshot({
      path: 'e2e-results/options-panel-hide-duration-before-reload-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();

    // Verify settings were persisted
    await expect(page.locator('#panel-hide-duration-input')).toHaveValue('120');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-panel-hide-duration-persistence-screenshot.png',
    });
  });

  test('should allow setting panel hide duration to 0 (disabled)', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Set duration to 0 (disables cookie hiding)
    await page.locator('#panel-hide-duration-input').fill('0');

    // Verify the value is 0
    await expect(page.locator('#panel-hide-duration-input')).toHaveValue('0');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Panel hide duration setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-panel-hide-duration-zero-screenshot.png',
    });
  });
});
