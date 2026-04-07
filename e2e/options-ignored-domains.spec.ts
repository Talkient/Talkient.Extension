import { test, expect } from './extension-test';

test.describe('Ignored Domains and Reset Cancel', () => {
  test.setTimeout(60000);

  async function navigateToOptions(
    page: import('@playwright/test').Page,
    extensionId: string,
  ): Promise<void> {
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .locator('h1:has-text("Talkient Settings")')
      .waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);
  }

  test('should add ignored domain with Enter key and persist after reload', async ({
    page,
    extensionId,
  }) => {
    await navigateToOptions(page, extensionId);

    await page.fill('#ignored-domain-input', '  WWW.Example.COM  ');
    await page.locator('#ignored-domain-input').press('Enter');

    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Ignored domain added!',
    );
    await expect(page.locator('#ignored-domains-list')).toContainText(
      'www.example.com',
    );

    await page.reload();
    await page
      .locator('#ignored-domains-list .ignored-domains-item-text')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.locator('#ignored-domains-list')).toContainText(
      'www.example.com',
    );
  });

  test('should reject invalid and duplicate ignored domains', async ({
    page,
    extensionId,
  }) => {
    await navigateToOptions(page, extensionId);

    await page.fill('#ignored-domain-input', 'invalid host');
    await page.click('#ignored-domain-add-button');

    await expect(page.locator('#status')).toHaveClass(/visible error/);
    await expect(page.locator('#status')).toContainText(
      'Invalid ignored domain.',
    );
    await expect(page.locator('#ignored-domains-validation')).toContainText(
      'Please enter a valid domain',
    );

    await page.fill('#ignored-domain-input', 'example.com');
    await page.click('#ignored-domain-add-button');
    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Ignored domain added!',
    );

    await page.fill('#ignored-domain-input', 'EXAMPLE.COM');
    await page.click('#ignored-domain-add-button');

    await expect(page.locator('#status')).toHaveClass(/visible warning/);
    await expect(page.locator('#status')).toContainText(
      'Duplicate ignored domain.',
    );
    await expect(page.locator('#ignored-domains-validation')).toContainText(
      'already in the ignored list',
    );

    await expect(
      page.locator('#ignored-domains-list .ignored-domains-item'),
    ).toHaveCount(1);
  });

  test('should edit and delete ignored domains', async ({
    page,
    extensionId,
  }) => {
    await navigateToOptions(page, extensionId);

    await page.fill('#ignored-domain-input', 'example.com');
    await page.click('#ignored-domain-add-button');
    await expect(page.locator('#ignored-domains-list')).toContainText(
      'example.com',
    );

    await page
      .locator(
        '#ignored-domains-list .ignored-domains-item button:has-text("Edit")',
      )
      .click();
    await expect(page.locator('#ignored-domain-add-button')).toHaveText('Save');
    await expect(page.locator('#ignored-domain-cancel-button')).toBeVisible();

    await page.fill('#ignored-domain-input', 'news.example.com');
    await page.click('#ignored-domain-add-button');

    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Ignored domain updated!',
    );
    await expect(page.locator('#ignored-domains-list')).toContainText(
      'news.example.com',
    );

    await page
      .locator(
        '#ignored-domains-list .ignored-domains-item button:has-text("Delete")',
      )
      .click();

    await expect(page.locator('#status')).toHaveClass(/visible success/);
    await expect(page.locator('#status')).toContainText(
      'Ignored domain removed!',
    );
    await expect(
      page.locator('#ignored-domains-list .ignored-domains-item'),
    ).toHaveCount(0);
    await expect(page.locator('#ignored-domains-empty')).toBeVisible();
  });

  test('should cancel reset to default settings and keep current values', async ({
    page,
    extensionId,
  }) => {
    await navigateToOptions(page, extensionId);

    await page.fill('#minimum-words-input', '11');
    await expect(page.locator('#minimum-words-input')).toHaveValue('11');

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
    });

    await page.click('#reset-default-settings-button');

    await expect(page.locator('#status')).toHaveClass(/visible warning/);
    await expect(page.locator('#status')).toContainText(
      'Reset to default settings canceled.',
    );
    await expect(page.locator('#minimum-words-input')).toHaveValue('11');

    await page.reload();
    await expect(page.locator('#minimum-words-input')).toHaveValue('11');
  });
});
