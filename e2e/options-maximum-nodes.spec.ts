import { test, expect } from './extension-test';

test.describe('Maximum Nodes Configuration', () => {
  test('should change maximum nodes processed setting', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Get the current value
    const initialValue = await page.locator('#max-nodes-input').inputValue();

    // Set a new value
    await page.locator('#max-nodes-input').fill('1250');

    // Verify the value changed
    await expect(page.locator('#max-nodes-input')).toHaveValue('1250');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Maximum nodes setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-maximum-nodes-screenshot.png',
    });
  });

  test('should validate negative value for maximum nodes setting', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Try to set a negative value (should be corrected to 0)
    await page.locator('#max-nodes-input').fill('-50');

    // Change focus to trigger validation
    await page.locator('#minimum-words-input').click();

    // Verify the value was corrected to 0
    await expect(page.locator('#max-nodes-input')).toHaveValue('0');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Maximum nodes setting saved!'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-maximum-nodes-validation-screenshot.png',
    });
  });

  test('should verify maximum nodes setting persistence', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Change the maximum nodes setting
    await page.locator('#max-nodes-input').fill('1350');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Take a before screenshot
    await page.screenshot({
      path: 'e2e-results/options-before-reload-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();

    // Verify settings were persisted
    await expect(page.locator('#max-nodes-input')).toHaveValue('1350');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-maximum-nodes-persistence-screenshot.png',
    });
  });

  test('should include maximum nodes in multiple settings persistence test', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Change multiple settings including maximum nodes
    await page.locator('#minimum-words-input').fill('6');
    await page.locator('#max-nodes-input').fill('1550');
    await page.selectOption('#highlight-style-select', 'minimal');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Take a screenshot before reload
    await page.screenshot({
      path: 'e2e-results/options-multiple-settings-before-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();

    // Verify all settings were persisted
    await expect(page.locator('#minimum-words-input')).toHaveValue('6');
    await expect(page.locator('#max-nodes-input')).toHaveValue('1550');
    await expect(page.locator('#highlight-style-select')).toHaveValue(
      'minimal'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-multiple-settings-persistence-screenshot.png',
    });
  });
});
