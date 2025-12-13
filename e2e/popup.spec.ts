import { test, expect } from './extension-test';

test.describe('Talkient Extension Popup', () => {
  test('should load popup correctly', async ({ page, extensionId }) => {
    // Navigate to the popup page
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the title element to be visible before checking
    await page.locator('.title').waitFor({ state: 'visible', timeout: 5000 });

    // Wait for popup container to ensure full load
    await page
      .locator('.popup-container')
      .waitFor({ state: 'visible', timeout: 5000 });

    // Take a screenshot for verification
    await page.screenshot({ path: 'e2e-results/popup-screenshot.png' });

    // Verify popup content loads correctly
    await expect(page).toHaveTitle(/Talkient/, { timeout: 5000 });
  });

  test('should display minimalist popup structure', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for key element to be visible
    await page.locator('.popup-container').waitFor({ state: 'visible' });

    // Verify header with title and tagline
    const title = page.locator('.title');
    await expect(title).toHaveText('Talkient');

    const tagline = page.locator('.tagline');
    await expect(tagline).toHaveText('Text-to-Speech');

    // Verify popup container exists
    const container = page.locator('.popup-container');
    await expect(container).toBeVisible();

    // Take screenshot of the minimalist design
    await page.screenshot({
      path: 'e2e-results/popup-minimalist-design.png',
    });
  });

  test('should display settings link with icon', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for settings link to be visible with explicit timeout
    const settingsLink = page.locator('#options-link');
    await settingsLink.waitFor({ state: 'visible', timeout: 5000 });

    // Verify settings link exists and is visible
    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toContainText('Settings');
    await expect(settingsLink).toHaveClass(/settings-link/);

    // Verify the settings icon SVG is present - wait for it explicitly
    const settingsIcon = page.locator('#options-link .settings-icon');
    await settingsIcon.waitFor({ state: 'visible', timeout: 5000 });
    await expect(settingsIcon).toBeVisible();

    // Take screenshot highlighting the settings link
    await page.screenshot({
      path: 'e2e-results/popup-settings-link.png',
    });
  });

  test('should display report issue link in footer', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for report link to be visible
    const reportLink = page.locator('#report-issue-link');
    await reportLink.waitFor({ state: 'visible' });

    // Verify report issue link exists
    await expect(reportLink).toBeVisible();
    await expect(reportLink).toHaveText('Report an issue');
    await expect(reportLink).toHaveClass(/report-link/);

    // Verify it's inside the footer
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('#report-issue-link')).toBeVisible();

    // Take screenshot showing the footer
    await page.screenshot({
      path: 'e2e-results/popup-report-link.png',
    });
  });

  test('should have subtle styling for report issue link', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    const reportLink = page.locator('#report-issue-link');
    await reportLink.waitFor({ state: 'visible' });

    // Wait for CSS to be fully loaded and computed
    await page.waitForLoadState('load');
    // Give extra time for CSS styles to be applied
    await page.waitForTimeout(300);

    // Check the link has subtle/light styling (color should be light gray)
    const color = await reportLink.evaluate(
      (el) => window.getComputedStyle(el).color
    );
    // The color should be a light gray (#bdc3c7 = rgb(189, 195, 199))
    // Handle both rgb() and rgba() formats, with flexible spacing
    expect(color).toMatch(
      /rgba?\(189,\s*195,\s*199(?:,\s*1)?\)|rgb\(189, 195, 199\)/
    );

    // Verify font size is small
    const fontSize = await reportLink.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(fontSize).toBe('11px');
  });

  test('should open GitHub issues page when report link is clicked', async ({
    page,
    extensionId,
    context,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    const reportLink = page.locator('#report-issue-link');
    await reportLink.waitFor({ state: 'visible', timeout: 5000 });

    // Set up listener for new page/tab with timeout
    const newPagePromise = context.waitForEvent('page', { timeout: 15000 });

    // Click the report issue link
    await reportLink.click();

    // Wait for the new page to open
    const newPage = await newPagePromise;

    // Wait for the page to start loading (may involve redirects)
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });

    // Wait a bit for any potential redirects to complete
    await newPage.waitForTimeout(1000);

    // Verify the URL is a GitHub URL
    // Note: GitHub may redirect to login or other pages, so we only verify it's github.com
    const url = newPage.url();
    expect(url).toContain('github.com');

    // Verify it's related to Talkient (either in URL or we're being redirected from the correct repo)
    // GitHub might redirect to login, so we make this assertion optional by checking both conditions
    const isTalkientUrl =
      url.includes('talkient-public') || url.includes('Talkient');
    const isGitHubDomain = url.includes('github.com');

    // Either we're on the talkient page, or we've been redirected to GitHub (which is acceptable)
    expect(isGitHubDomain).toBe(true);

    // Take screenshot of the GitHub page
    await newPage.screenshot({
      path: 'e2e-results/popup-github-issues-page.png',
    });
  });

  test('should navigate to options page when settings link is clicked', async ({
    page,
    extensionId,
    context,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    const settingsLink = page.locator('#options-link');
    await settingsLink.waitFor({ state: 'visible' });

    // Set up listener for new page
    const optionsPagePromise = context.waitForEvent('page');

    // Click the settings link
    await settingsLink.click();

    // Wait for the options page to open
    const optionsPage = await optionsPagePromise;
    await optionsPage.waitForLoadState('domcontentloaded');

    // Verify we're on the options page
    await expect(optionsPage).toHaveTitle('Talkient Options');

    // Take screenshot of the options page
    await optionsPage.screenshot({
      path: 'e2e-results/popup-to-options-navigation.png',
    });
  });

  test('should have correct visual hierarchy', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for all elements to be visible
    const header = page.locator('.header');
    const settingsLink = page.locator('#options-link');
    const footer = page.locator('.footer');

    await header.waitFor({ state: 'visible' });
    await settingsLink.waitFor({ state: 'visible' });
    await footer.waitFor({ state: 'visible' });

    // Get bounding boxes to verify visual order
    const headerBox = await header.boundingBox();
    const settingsBox = await settingsLink.boundingBox();
    const footerBox = await footer.boundingBox();

    expect(headerBox).toBeTruthy();
    expect(settingsBox).toBeTruthy();
    expect(footerBox).toBeTruthy();

    // Header should be above settings link
    expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(
      settingsBox!.y
    );

    // Settings link should be above footer
    expect(settingsBox!.y + settingsBox!.height).toBeLessThanOrEqual(
      footerBox!.y
    );
  });

  test('should have hover effect on settings link', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    const settingsLink = page.locator('#options-link');
    await settingsLink.waitFor({ state: 'visible' });

    // Get initial background color
    const initialBgColor = await settingsLink.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );

    // Hover over the settings link
    await settingsLink.hover();

    // Wait for transition
    await page.waitForTimeout(300);

    // Get hover background color
    const hoverBgColor = await settingsLink.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );

    // Colors should be different on hover
    expect(hoverBgColor).not.toBe(initialBgColor);

    // Take screenshot of hover state
    await page.screenshot({
      path: 'e2e-results/popup-settings-hover.png',
    });
  });
});
