import { test, expect } from './extension-test';

test.describe('Control Panel Visibility Configuration', () => {
  test('should have control panel visibility multi-select element', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the control panel visibility select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // Verify the element is a multi-select
    const isMultiple = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return select.multiple;
    });
    expect(isMultiple).toBe(true);

    // Verify it has the correct options
    const optionCount = await page
      .locator('#control-panel-visibility-select option')
      .count();
    expect(optionCount).toBe(2);

    // Verify the option values
    const optionValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.options).map((opt) => opt.value);
    });
    expect(optionValues).toEqual(['hidden', 'collapsed']);

    // Verify the option text
    const optionTexts = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.options).map((opt) => opt.textContent);
    });
    expect(optionTexts).toEqual(['Hidden', 'Collapsed']);

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-initial-screenshot.png',
    });
  });

  test('should select single option in control panel visibility', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // Select the 'hidden' option
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      const hiddenOption = Array.from(select.options).find(
        (opt) => opt.value === 'hidden'
      );
      if (hiddenOption) {
        hiddenOption.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Wait for the status message
    await page.waitForSelector('#status.visible.success');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Control panel visibility setting saved!'
    );

    // Verify the selection
    const selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toContain('hidden');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-hidden-screenshot.png',
    });
  });

  test('should select multiple options in control panel visibility', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // Select both options
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = true;
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for the status message
    await page.waitForSelector('#status.visible.success');

    // Verify status message appears
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Control panel visibility setting saved!'
    );

    // Verify both options are selected
    const selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toHaveLength(2);
    expect(selectedValues).toContain('hidden');
    expect(selectedValues).toContain('collapsed');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-both-screenshot.png',
    });
  });

  test('should deselect all options in control panel visibility', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // First select an option
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      const hiddenOption = Array.from(select.options).find(
        (opt) => opt.value === 'hidden'
      );
      if (hiddenOption) {
        hiddenOption.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Wait for the status message
    await page.waitForSelector('#status.visible.success');

    // Now deselect all options
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = false;
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for the status message again
    await page.waitForSelector('#status.visible.success');

    // Verify no options are selected
    const selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toHaveLength(0);

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-none-screenshot.png',
    });
  });

  test('should persist control panel visibility setting across page reloads', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // Select the 'collapsed' option
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      const collapsedOption = Array.from(select.options).find(
        (opt) => opt.value === 'collapsed'
      );
      if (collapsedOption) {
        collapsedOption.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Take a screenshot before reload
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-before-reload-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();

    // Wait for the page to load
    await page.waitForSelector('#control-panel-visibility-select');

    // Verify the setting persisted
    const selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toContain('collapsed');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-persistence-screenshot.png',
    });
  });

  test('should persist multiple selections across page reloads', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // Select both options
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = true;
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Reload the page to verify persistence
    await page.reload();

    // Wait for the page to load
    await page.waitForSelector('#control-panel-visibility-select');

    // Verify both selections persisted
    const selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toHaveLength(2);
    expect(selectedValues).toContain('hidden');
    expect(selectedValues).toContain('collapsed');

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-multiple-persistence-screenshot.png',
    });
  });

  test('should include control panel visibility in multi-setting persistence', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for elements to be ready
    await page.waitForSelector('#control-panel-visibility-select');
    await page.waitForSelector('#minimum-words-input');
    await page.waitForSelector('#highlight-style-select');

    // Change multiple settings including control panel visibility
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      const hiddenOption = Array.from(select.options).find(
        (opt) => opt.value === 'hidden'
      );
      if (hiddenOption) {
        hiddenOption.selected = true;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.locator('#minimum-words-input').fill('6');
    await page.selectOption('#highlight-style-select', 'elegant');

    // Wait for settings to be saved
    await page.waitForTimeout(500);

    // Take a screenshot before reload
    await page.screenshot({
      path: 'e2e-results/options-multi-settings-with-control-panel-visibility-before-screenshot.png',
    });

    // Reload the page to verify persistence
    await page.reload();

    // Wait for the page to load
    await page.waitForSelector('#control-panel-visibility-select');

    // Verify all settings were persisted
    const selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toContain('hidden');

    await expect(page.locator('#minimum-words-input')).toHaveValue('6');
    await expect(page.locator('#highlight-style-select')).toHaveValue(
      'elegant'
    );

    // Take a screenshot for verification
    await page.screenshot({
      path: 'e2e-results/options-multi-settings-with-control-panel-visibility-persistence-screenshot.png',
    });
  });

  test('should toggle between different control panel visibility options', async ({
    page,
    extensionId,
  }) => {
    // Navigate to the options page
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Wait for the select to be ready
    await page.waitForSelector('#control-panel-visibility-select');

    // Select 'hidden'
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = opt.value === 'hidden';
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for status message
    await page.waitForSelector('#status.visible.success');

    // Verify 'hidden' is selected
    let selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toEqual(['hidden']);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-toggle-hidden-screenshot.png',
    });

    // Now switch to 'collapsed'
    await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      Array.from(select.options).forEach((opt) => {
        opt.selected = opt.value === 'collapsed';
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for status message
    await page.waitForSelector('#status.visible.success');

    // Verify 'collapsed' is selected
    selectedValues = await page.evaluate(() => {
      const select = document.getElementById(
        'control-panel-visibility-select'
      ) as HTMLSelectElement;
      return Array.from(select.selectedOptions).map((opt) => opt.value);
    });
    expect(selectedValues).toEqual(['collapsed']);

    // Take a screenshot
    await page.screenshot({
      path: 'e2e-results/options-control-panel-visibility-toggle-collapsed-screenshot.png',
    });
  });
});
