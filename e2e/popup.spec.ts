import { test, expect } from './extension-test';

test.describe('Talkient Extension Popup', () => {
  test('should load popup correctly', async ({ page, extensionId }) => {
    // Navigate to the popup page
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Take a screenshot for verification
    await page.screenshot({ path: 'e2e-results/popup-screenshot.png' });

    // Verify popup content loads correctly
    await expect(page).toHaveTitle(/Talkient/);

    // Add more assertions based on the expected content of your popup
    // For example, check for specific elements:
    // await expect(page.locator('h1')).toContainText('Talkient');
  });
});
