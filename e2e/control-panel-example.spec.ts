import { test, expect } from './extension-test';
import * as path from 'path';

test.describe('Talkient Control Panel on Example.html', () => {
  test('should render control panel correctly on example.html', async ({
    page,
  }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for the control panel to be created
    await page.waitForTimeout(2000);

    // Check if control panel exists
    const controlPanelExists = await page.evaluate(() => {
      return document.getElementById('talkient-control-panel') !== null;
    });

    expect(controlPanelExists).toBeTruthy();

    // Check if the control panel has the correct width (should be 120px, not 600px from page styles)
    const panelWidth = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      return panel ? window.getComputedStyle(panel).width : null;
    });

    expect(panelWidth).toBe('120px');

    // Expand the panel to check internal elements
    await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      const toggleButton = panel?.querySelector(
        '.talkient-panel-toggle',
      ) as HTMLButtonElement;
      if (toggleButton) {
        toggleButton.click();
      }
    });

    // Wait for expansion
    await page.waitForTimeout(500);

    // Check if internal divs are not affected by the page's div { width: 600px } rule
    const panelHeaderWidth = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      const header = panel?.querySelector('.talkient-panel-header');
      return header ? window.getComputedStyle(header).width : null;
    });

    // Header should not be 600px
    expect(panelHeaderWidth).not.toBe('600px');

    // Check control sections
    const controlSectionWidth = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      const section = panel?.querySelector('.talkient-control-section');
      return section ? window.getComputedStyle(section).width : null;
    });

    // Section should not be 600px
    expect(controlSectionWidth).not.toBe('600px');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/control-panel-example-screenshot.png',
    });

    // Check if settings button is clickable
    const settingsButtonExists = await page.evaluate(() => {
      const btn = document.querySelector('.talkient-control-btn.settings');
      return btn !== null;
    });

    expect(settingsButtonExists).toBeTruthy();

    // Check if speech rate slider exists and is visible
    const sliderExists = await page.evaluate(() => {
      const slider = document.querySelector('.talkient-rate-slider');
      return slider !== null;
    });

    expect(sliderExists).toBeTruthy();
  });

  test('should allow toggling scripts on example.html', async ({ page }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for the control panel to be created
    await page.waitForTimeout(2000);

    // Expand the panel
    await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      const toggleButton = panel?.querySelector(
        '.talkient-panel-toggle',
      ) as HTMLButtonElement;
      if (toggleButton) {
        toggleButton.click();
      }
    });

    // Wait for expansion
    await page.waitForTimeout(500);

    // Check if toggle input exists and is checked
    const toggleState = await page.evaluate(() => {
      const toggleInput = document.querySelector(
        '.talkient-toggle-input',
      ) as HTMLInputElement;
      return toggleInput ? toggleInput.checked : null;
    });

    expect(toggleState).toBe(true);

    // Toggle it off
    await page.click('.talkient-toggle-slider');
    await page.waitForTimeout(500);

    // Verify it's off
    const toggleStateAfter = await page.evaluate(() => {
      const toggleInput = document.querySelector(
        '.talkient-toggle-input',
      ) as HTMLInputElement;
      return toggleInput ? toggleInput.checked : null;
    });

    expect(toggleStateAfter).toBe(false);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/control-panel-example-toggle-screenshot.png',
    });
  });

  test('should have proper z-index on example.html', async ({ page }) => {
    // Calculate the path to the local example test page
    const testPagePath = path.join(__dirname, 'test-pages', 'example.html');
    const fileUrl = `file://${testPagePath.replace(/\\/g, '/')}`;

    // Navigate to example.html
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // Wait for the control panel to be created
    await page.waitForTimeout(2000);

    // Check if control panel has high z-index
    const zIndex = await page.evaluate(() => {
      const panel = document.getElementById('talkient-control-panel');
      return panel ? window.getComputedStyle(panel).zIndex : null;
    });

    expect(zIndex).toBe('999999');
  });
});
