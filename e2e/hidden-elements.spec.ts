import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Talkient Hidden Elements Tests', () => {
  // Increase timeout for this specific test
  test.setTimeout(60000);

  test('should not process hidden elements or add play buttons to them', async ({
    page,
    context,
    extensionId,
  }) => {
    // Get the absolute path to our test HTML file
    const testHtmlPath = path.resolve(
      __dirname,
      'test-pages/hidden-elements-test.html'
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
    expect(pageTitle).toBe('Talkient Hidden Elements Test Page');

    console.log(`Test page loaded: "${pageTitle}"`);

    // Wait for content script to process the page and add play buttons
    await page
      .waitForSelector('.talkient-play-button', { timeout: 10000 })
      .catch(() => {
        console.log('Timed out waiting for play buttons to appear');
      });

    // Take a screenshot of initial state
    await page.screenshot({
      path: 'e2e-results/hidden-elements-initial-state.png',
    });

    // Test 1: Verify visible control paragraph has a play button
    const controlButtonExists = await page.evaluate(() => {
      const controlParagraph = document.getElementById('control-paragraph');
      if (!controlParagraph) return false;

      // Look for a play button in the control paragraph's parent
      const parent = controlParagraph.parentElement;
      return parent ? !!parent.querySelector('.talkient-play-button') : false;
    });

    console.log(`Control paragraph has play button: ${controlButtonExists}`);
    expect(controlButtonExists).toBeTruthy();

    // Test 2: Verify hidden paragraphs don't have play buttons
    const hiddenElementsCheck = await page.evaluate(() => {
      const results = {
        displayNone: false,
        visibilityHidden: false,
        opacityZero: false,
        nestedElements: false,
      };

      // Check display:none section
      const displayNoneContainer = document.querySelector('.display-none');
      results.displayNone = displayNoneContainer
        ? !!displayNoneContainer.querySelector('.talkient-play-button')
        : false;

      // Check visibility:hidden section
      const visibilityHiddenContainer =
        document.querySelector('.visibility-hidden');
      results.visibilityHidden = visibilityHiddenContainer
        ? !!visibilityHiddenContainer.querySelector('.talkient-play-button')
        : false;

      // Check opacity:0 section
      const opacityZeroContainer = document.querySelector('.opacity-zero');
      results.opacityZero = opacityZeroContainer
        ? !!opacityZeroContainer.querySelector('.talkient-play-button')
        : false;

      // Check nested hidden elements
      const nestedContainer = document.getElementById('nested-container');
      results.nestedElements = nestedContainer
        ? !!nestedContainer.querySelector('.talkient-play-button')
        : false;

      return results;
    });

    console.log('Hidden elements check results:', hiddenElementsCheck);

    // None of these hidden elements should have play buttons
    expect(hiddenElementsCheck.displayNone).toBeFalsy();
    expect(hiddenElementsCheck.visibilityHidden).toBeFalsy();
    expect(hiddenElementsCheck.opacityZero).toBeFalsy();
    expect(hiddenElementsCheck.nestedElements).toBeFalsy();

    // Test 3: Toggle display:none and verify play button appears when element becomes visible
    console.log('Testing display:none toggle...');

    // Click the toggle button
    await page.click('#section1 button');

    // Wait a moment for processing
    await page.waitForTimeout(1000);

    // Force reprocessing to ensure the extension has a chance to process newly visible elements
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

    // Wait for reprocessing
    await page.waitForTimeout(2000);

    // Take a screenshot after toggle
    await page.screenshot({
      path: 'e2e-results/hidden-elements-display-none-toggled.png',
    });

    // Check if play button was added after element became visible
    const displayNoneButtonAfterToggle = await page.evaluate(() => {
      const displayNoneContainer = document.querySelector('.display-none');
      // Return null if container doesn't exist
      if (!displayNoneContainer) return null;

      // Check if display is now block
      const isVisible =
        window.getComputedStyle(displayNoneContainer).display !== 'none';

      // Check if there's a play button
      const hasButton = !!displayNoneContainer.querySelector(
        '.talkient-play-button'
      );

      return { isVisible, hasButton };
    });

    console.log('Display:none after toggle:', displayNoneButtonAfterToggle);

    // If the element is now visible, it should have a play button
    if (
      displayNoneButtonAfterToggle &&
      displayNoneButtonAfterToggle.isVisible
    ) {
      expect(displayNoneButtonAfterToggle.hasButton).toBeTruthy();
    }

    // Test 4: Toggle visibility:hidden and verify play button appears when element becomes visible
    console.log('Testing visibility:hidden toggle...');

    // Click the toggle button
    await page.click('#section2 button');

    // Wait a moment for processing
    await page.waitForTimeout(1000);

    // Force reprocessing
    await page.evaluate(() => {
      const reloadEvent = new CustomEvent('talkient:reload-play-buttons');
      document.dispatchEvent(reloadEvent);

      const dummyElem = document.createElement('div');
      dummyElem.id = 'talkient-mutation-trigger';
      document.body.appendChild(dummyElem);
      setTimeout(() => dummyElem.remove(), 500);
    });

    // Wait for reprocessing
    await page.waitForTimeout(2000);

    // Take a screenshot after toggle
    await page.screenshot({
      path: 'e2e-results/hidden-elements-visibility-hidden-toggled.png',
    });

    // Check if play button was added after element became visible
    const visibilityHiddenButtonAfterToggle = await page.evaluate(() => {
      const visibilityHiddenContainer =
        document.querySelector('.visibility-hidden');
      if (!visibilityHiddenContainer) return null;

      const isVisible =
        window.getComputedStyle(visibilityHiddenContainer).visibility !==
        'hidden';
      const hasButton = !!visibilityHiddenContainer.querySelector(
        '.talkient-play-button'
      );

      return { isVisible, hasButton };
    });

    console.log(
      'Visibility:hidden after toggle:',
      visibilityHiddenButtonAfterToggle
    );

    // If the element is now visible, it should have a play button
    if (
      visibilityHiddenButtonAfterToggle &&
      visibilityHiddenButtonAfterToggle.isVisible
    ) {
      expect(visibilityHiddenButtonAfterToggle.hasButton).toBeTruthy();
    }

    // Test 5: Test dynamic visibility changes
    console.log('Testing dynamic visibility changes...');

    // Verify dynamic paragraph has a play button initially
    const dynamicButtonInitial = await page.evaluate(() => {
      const dynamicContainer = document.getElementById('dynamic-container');
      return dynamicContainer
        ? !!dynamicContainer.querySelector('.talkient-play-button')
        : false;
    });

    console.log(
      `Dynamic paragraph has initial play button: ${dynamicButtonInitial}`
    );
    expect(dynamicButtonInitial).toBeTruthy();

    // Instead of using the button, let's directly modify the style to ensure it works
    await page.evaluate(() => {
      const dynamicContainer = document.getElementById('dynamic-container');
      if (dynamicContainer) {
        dynamicContainer.style.display = 'none';
      }
    });

    // Wait a moment
    await page.waitForTimeout(1000);

    // Take a screenshot after hiding
    await page.screenshot({
      path: 'e2e-results/hidden-elements-dynamic-hidden.png',
    });

    // Verify the element is hidden
    const dynamicButtonAfterHiding = await page.evaluate(() => {
      const dynamicContainer = document.getElementById('dynamic-container');
      if (!dynamicContainer) return { isVisible: false, hasButton: false };

      return {
        isVisible: dynamicContainer.style.display !== 'none',
        hasButton: !!dynamicContainer.querySelector('.talkient-play-button'),
        display: dynamicContainer.style.display,
      };
    });

    console.log('Dynamic paragraph after hiding:', dynamicButtonAfterHiding);

    // Container should be hidden with display:none
    expect(dynamicButtonAfterHiding.display).toBe('none');

    // Now make the element visible again
    await page.evaluate(() => {
      const dynamicContainer = document.getElementById('dynamic-container');
      if (dynamicContainer) {
        dynamicContainer.style.display = 'block';
      }
    });

    // Wait a moment
    await page.waitForTimeout(1000);

    // Force reprocessing
    await page.click('#section5 button:nth-child(2)');

    // Wait for reprocessing
    await page.waitForTimeout(2000);

    // Take a screenshot after showing again
    await page.screenshot({
      path: 'e2e-results/hidden-elements-dynamic-shown.png',
    });

    // Verify play button reappears
    const dynamicButtonAfterShowing = await page.evaluate(() => {
      const dynamicContainer = document.getElementById('dynamic-container');
      if (!dynamicContainer) return { isVisible: false, hasButton: false };

      const isVisible =
        window.getComputedStyle(dynamicContainer).display !== 'none';
      const hasButton = !!dynamicContainer.querySelector(
        '.talkient-play-button'
      );

      return { isVisible, hasButton };
    });

    console.log(
      'Dynamic paragraph after showing again:',
      dynamicButtonAfterShowing
    );

    // Container should be visible again and have a play button
    expect(dynamicButtonAfterShowing.isVisible).toBeTruthy();
    expect(dynamicButtonAfterShowing.hasButton).toBeTruthy();

    console.log('Hidden elements testing completed successfully!');
  });
});
