import { test, expect } from './extension-test';

const DEFAULT_SELECTED = ['article', 'p', 'h1', 'h2', 'h3', 'li'];

test.describe('Processable Elements Configuration', () => {
  test.setTimeout(60000);

  test('should display searchable multi-select with default selections', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');

    const search = page.locator('#processable-elements-search');
    const select = page.locator('#processable-elements-select');

    await search.waitFor({ state: 'visible', timeout: 5000 });
    await page
      .locator('#processable-elements-select option[value="article"]')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    await expect(search).toBeVisible();
    await expect(select).toBeVisible();

    const selectedValues = await page.evaluate(() => {
      const selectEl = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      return Array.from(selectEl.selectedOptions).map((option) => option.value);
    });
    expect(selectedValues).toEqual(DEFAULT_SELECTED);

    const heading = page.locator('h2:has-text("Processable Elements")');
    await expect(heading).toBeVisible();

    await page.screenshot({
      path: 'e2e-results/options-processable-elements-default-screenshot.png',
    });
  });

  test('should update selection, persist to storage, and preserve search filtering', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .locator('#processable-elements-select option[value="h1"]')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    // Select a custom set
    await page.evaluate(() => {
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      const keep = new Set(['article', 'p', 'blockquote']);
      Array.from(select.options).forEach((option) => {
        option.selected = keep.has(option.value);
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify status message appears confirming save
    await page.waitForSelector('#status.visible.success');
    await expect(page.locator('#status')).toContainText(
      'Processable elements saved!',
    );

    // Verify the storage was updated
    const storedValue = await page.evaluate(() => {
      return new Promise<string[]>((resolve) => {
        chrome.storage.local.get(['processableElements'], (result) => {
          resolve(result.processableElements as string[]);
        });
      });
    });
    expect(storedValue).toEqual(['article', 'p', 'blockquote']);

    // Verify search filters visible options
    await page.fill('#processable-elements-search', 'head');
    const visibleOptions = await page.evaluate(() => {
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      return Array.from(select.options)
        .filter((option) => !option.hidden)
        .map((option) => option.value);
    });
    expect(visibleOptions).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    await page.screenshot({
      path: 'e2e-results/options-processable-elements-selection-screenshot.png',
    });

    // Reload and verify selected values persist
    await page.reload();
    await page
      .locator('#processable-elements-select option[value="article"]')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    const selectedAfterReload = await page.evaluate(() => {
      const selectEl = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      return Array.from(selectEl.selectedOptions).map((option) => option.value);
    });
    expect(selectedAfterReload).toEqual(['article', 'p', 'blockquote']);

    await page.screenshot({
      path: 'e2e-results/options-processable-elements-persistence-screenshot.png',
    });
  });

  test('should allow selecting multiple options by clicking without keyboard modifiers', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .locator('#processable-elements-select option[value="h4"]')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      const h4 = select.querySelector(
        'option[value="h4"]',
      ) as HTMLOptionElement;
      const article = select.querySelector(
        'option[value="article"]',
      ) as HTMLOptionElement;

      h4.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      article.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    const storedValue = await page.evaluate(() => {
      return new Promise<string[]>((resolve) => {
        chrome.storage.local.get(['processableElements'], (result) => {
          resolve(result.processableElements as string[]);
        });
      });
    });

    expect(storedValue).toContain('h4');
    expect(storedValue).not.toContain('article');
  });
});
