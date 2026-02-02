import { test, expect } from './extension-test';

test.describe('Button Position Configuration', () => {
  test('should change button position setting', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the page to be loaded
    await page.waitForLoadState('domcontentloaded');

    // Wait for the button position select to be ready and visible
    await page
      .locator('#button-position-select')
      .waitFor({ state: 'visible', timeout: 5000 });
    // Give time for storage to load and populate the select
    await page.waitForTimeout(500);

    // Get the current value (should default to 'left')
    const initialValue = await page
      .locator('#button-position-select')
      .inputValue();
    expect(initialValue).toBe('left');

    // Change to 'right'
    await page.selectOption('#button-position-select', 'right');

    // Verify the value changed
    await expect(page.locator('#button-position-select')).toHaveValue('right');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Button position setting saved!',
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-button-position-right-screenshot.png',
    });

    // Change back to 'left'
    await page.selectOption('#button-position-select', 'left');

    // Verify the value changed back
    await expect(page.locator('#button-position-select')).toHaveValue('left');

    // Verify status message appears again
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Button position setting saved!',
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-button-position-left-screenshot.png',
    });
  });

  test('should persist button position setting across page reloads', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the button position select to be ready
    await page.waitForSelector('#button-position-select');

    // Change to 'right'
    await page.selectOption('#button-position-select', 'right');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Reload the page to verify persistence
    await page.reload();

    // Wait for the page to load
    await page.waitForSelector('#button-position-select');

    // Verify the setting persisted
    await expect(page.locator('#button-position-select')).toHaveValue('right');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-button-position-persistence-screenshot.png',
    });
  });

  test('should include button position in multi-setting persistence', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for elements to be ready
    await page.waitForSelector('#button-position-select');
    await page.waitForSelector('#minimum-words-input');
    await page.waitForSelector('#highlight-style-select');

    // Change multiple settings including button position
    await page.selectOption('#button-position-select', 'right');
    await page.locator('#minimum-words-input').fill('5');
    await page.selectOption('#highlight-style-select', 'bold');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Take a screenshot before reload
    await page.screenshot({
      path: 'e2e-results/options-multi-settings-with-button-position-before-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();

    // Wait for the page to load
    await page.waitForSelector('#button-position-select');

    // Verify all settings were persisted
    await expect(page.locator('#button-position-select')).toHaveValue('right');
    await expect(page.locator('#minimum-words-input')).toHaveValue('5');
    await expect(page.locator('#highlight-style-select')).toHaveValue('bold');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-multi-settings-with-button-position-persistence-screenshot.png',
    });
  });
});
