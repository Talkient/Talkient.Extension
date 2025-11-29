import { test, expect } from './extension-test';
import * as path from 'path';

// Helper function to open and get the side panel
async function openSidePanel(context: any, extensionId: string) {
  const sidePanelUrl = `chrome-extension://${extensionId}/sidepanel/sidepanel.html`;
  const sidePanelPage = await context.newPage();
  await sidePanelPage.goto(sidePanelUrl);
  await sidePanelPage.waitForLoadState('networkidle');
  return sidePanelPage;
}

test.describe('Talkient Side Panel on Example.html', () => {
  test('should render side panel correctly on example.html', async ({
    page,
    context,
    extensionId,
  }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for content script to load
    await page.waitForTimeout(1000);

    // Open the side panel
    const sidePanelPage = await openSidePanel(context, extensionId);
    
    // Wait for side panel to be ready
    await sidePanelPage.waitForSelector('#talkient-control-panel', { timeout: 5000 });

    // Check if side panel exists
    const sidePanelExists = await sidePanelPage.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(sidePanelExists).toBeTruthy();

    // Check if settings button exists in side panel
    const settingsButtonExists = await sidePanelPage.evaluate(() => {
      const btn = document.querySelector('.talkient-control-btn.settings');
      return btn !== null;
    });

    expect(settingsButtonExists).toBeTruthy();

    // Check if speech rate slider exists and is visible in side panel
    const sliderExists = await sidePanelPage.evaluate(() => {
      const slider = document.querySelector('.talkient-rate-slider');
      return slider !== null;
    });

    expect(sliderExists).toBeTruthy();

    // Take a screenshot for verification
    await sidePanelPage.screenshot({
      path: 'e2e-results/sidepanel-example-screenshot.png',
    });

    await sidePanelPage.close();
  });

  test('should allow toggling scripts on example.html', async ({
    page,
    context,
    extensionId,
  }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for content script to load
    await page.waitForTimeout(1000);

    // Open the side panel
    const sidePanelPage = await openSidePanel(context, extensionId);
    await sidePanelPage.waitForSelector('#talkient-control-panel', { timeout: 5000 });

    // Check if toggle input exists and is checked
    const toggleState = await sidePanelPage
      .locator('.talkient-toggle-input')
      .isChecked();

    expect(toggleState).toBe(true);

    // Toggle it off
    await sidePanelPage.click('.talkient-toggle-slider');
    await sidePanelPage.waitForTimeout(500);

    // Verify it's off
    const toggleStateAfter = await sidePanelPage
      .locator('.talkient-toggle-input')
      .isChecked();

    expect(toggleStateAfter).toBe(false);

    // Take a screenshot
    await sidePanelPage.screenshot({
      path: 'e2e-results/sidepanel-example-toggle-screenshot.png',
    });

    await sidePanelPage.close();
  });
});
