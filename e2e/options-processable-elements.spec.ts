import { test, expect } from './extension-test';

const ELEMENT_IDS = [
  { id: 'elem-article', tag: 'article' },
  { id: 'elem-p', tag: 'p' },
  { id: 'elem-h1', tag: 'h1' },
  { id: 'elem-h2', tag: 'h2' },
  { id: 'elem-h3', tag: 'h3' },
  { id: 'elem-li', tag: 'li' },
];

test.describe('Processable Elements Configuration', () => {
  test.setTimeout(60000);

  test('should display all six checkboxes checked by default', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for storage to load and populate checkboxes
    await page
      .locator('#elem-article')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify all six checkboxes are present and checked
    for (const { id } of ELEMENT_IDS) {
      const checkbox = page.locator(`#${id}`);
      await expect(checkbox).toBeChecked();
    }

    // Verify the section heading exists
    const heading = page.locator('h2:has-text("Processable Elements")');
    await expect(heading).toBeVisible();

    await page.screenshot({
      path: 'e2e-results/options-processable-elements-default-screenshot.png',
    });
  });

  test('should uncheck a checkbox, persist to storage, and remain unchecked after reload', async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .locator('#elem-h1')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    // Uncheck h1
    await page.evaluate(() => {
      const checkbox = document.getElementById('elem-h1') as HTMLInputElement;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify status message appears confirming save
    await page.waitForSelector('#status.visible.success');
    await expect(page.locator('#status')).toContainText(
      'Processable elements saved!',
    );

    // Verify the storage was updated (h1 not in the array)
    const storedValue = await page.evaluate(() => {
      return new Promise<string[]>((resolve) => {
        chrome.storage.local.get(['processableElements'], (result) => {
          resolve(result.processableElements as string[]);
        });
      });
    });
    expect(storedValue).not.toContain('h1');
    expect(storedValue).toContain('article');
    expect(storedValue).toContain('p');

    await page.screenshot({
      path: 'e2e-results/options-processable-elements-unchecked-screenshot.png',
    });

    // Reload and verify the unchecked state persists
    await page.reload();
    await page
      .locator('#elem-h1')
      .waitFor({ state: 'attached', timeout: 5000 });
    await page.waitForTimeout(500);

    await expect(page.locator('#elem-h1')).not.toBeChecked();
    // Other checkboxes should still be checked
    await expect(page.locator('#elem-article')).toBeChecked();
    await expect(page.locator('#elem-p')).toBeChecked();

    await page.screenshot({
      path: 'e2e-results/options-processable-elements-persistence-screenshot.png',
    });
  });
});
