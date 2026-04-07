import { test, expect } from './extension-test';
import type { Page } from '@playwright/test';

const popupPath = '/popup/popup.html';
const authStorageKey = 'talkient_auth_state';

type PopupAuthState = {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
    verified_email: boolean;
  } | null;
  lastUpdated: number;
};

async function gotoPopup(page: Page, extensionId: string): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}${popupPath}`);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.popup-container').waitFor({ state: 'visible' });
}

async function setPopupStorage(
  page: Page,
  values: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(async (storageValues) => {
    await chrome.storage.local.set(storageValues);
  }, values);
}

async function getPopupStorage<T>(
  page: Page,
  key: string,
): Promise<T | undefined> {
  return page.evaluate(async (storageKey) => {
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] as T | undefined;
  }, key);
}

async function removePopupStorage(page: Page, key: string): Promise<void> {
  await page.evaluate(async (storageKey) => {
    await chrome.storage.local.remove(storageKey);
  }, key);
}

test.describe('Talkient Extension Popup', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    await gotoPopup(page, extensionId);
  });

  test('loads the popup shell and essential actions', async ({ page }) => {
    await expect(page).toHaveTitle(/Talkient/);
    await expect(page.locator('.title')).toHaveText('Talkient');
    await expect(page.locator('.tagline')).toHaveText('Text-to-Speech');
    await expect(page.locator('#voice-select')).toBeVisible();
    await expect(page.locator('#options-link')).toBeVisible();
    await expect(page.locator('#report-issue-link')).toBeVisible();
  });

  test('navigates to options page from the settings link', async ({
    page,
    context,
  }) => {
    const optionsPagePromise = context.waitForEvent('page');

    await page.locator('#options-link').click();

    const optionsPage = await optionsPagePromise;
    await optionsPage.waitForLoadState('domcontentloaded');

    await expect(optionsPage).toHaveTitle('Talkient Options');
    await optionsPage.close();
  });

  test('opens the GitHub issue flow from the report link', async ({
    page,
    context,
  }) => {
    const newPagePromise = context.waitForEvent('page', { timeout: 15000 });

    await page.locator('#report-issue-link').click();

    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });

    expect(newPage.url()).toContain('github.com');
    await newPage.close();
  });

  test('shows stored authenticated user details in the popup', async ({
    page,
    extensionId,
  }) => {
    const authState: PopupAuthState = {
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        picture: 'https://example.com/ada.png',
        verified_email: true,
      },
      lastUpdated: Date.now(),
    };

    await setPopupStorage(page, { [authStorageKey]: authState });
    await gotoPopup(page, extensionId);

    await expect(page.locator('#user-profile')).toBeVisible();
    await expect(page.locator('#sign-in-btn')).toBeHidden();
    await expect(page.locator('#user-name')).toHaveText(authState.user.name);
    await expect(page.locator('#user-email')).toHaveText(authState.user.email);
    await expect(page.locator('#user-avatar')).toHaveAttribute(
      'src',
      authState.user.picture,
    );
  });

  test('signing out from the popup clears stored auth state and returns to signed-out UI', async ({
    page,
    extensionId,
  }) => {
    const authState: PopupAuthState = {
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        picture: 'https://example.com/ada.png',
        verified_email: true,
      },
      lastUpdated: Date.now(),
    };

    await setPopupStorage(page, { [authStorageKey]: authState });
    await gotoPopup(page, extensionId);

    await expect(page.locator('#user-profile')).toBeVisible();

    await page.locator('#sign-out-btn').click();

    await expect(page.locator('#sign-in-btn')).toBeVisible();
    await expect(page.locator('#user-profile')).toBeHidden();

    const storedAuthState = await getPopupStorage<PopupAuthState>(
      page,
      authStorageKey,
    );
    expect(storedAuthState).toBeUndefined();
  });

  test('persists voice selection across popup reopen', async ({
    page,
    extensionId,
  }) => {
    const voiceSelect = page.locator('#voice-select');
    const optionCount = await page.locator('#voice-select option').count();

    expect(optionCount).toBeGreaterThan(0);

    if (optionCount === 1) {
      await expect(voiceSelect).toHaveValue('default');
      return;
    }

    await voiceSelect.selectOption({ index: 1 });
    const chosenVoice = await voiceSelect.inputValue();

    await gotoPopup(page, extensionId);
    await expect(page.locator('#voice-select')).toHaveValue(chosenVoice);

    const storedVoice = await getPopupStorage<string>(page, 'selectedVoice');
    expect(storedVoice).toBe(chosenVoice);
  });

  test('falls back to default when stored voice no longer exists', async ({
    page,
    extensionId,
  }) => {
    await setPopupStorage(page, {
      selectedVoice: 'Voice That No Longer Exists',
    });

    await gotoPopup(page, extensionId);

    await expect(page.locator('#voice-select')).toHaveValue('default');
  });

  test('shows the signed-out state when no auth state is stored', async ({
    page,
    extensionId,
  }) => {
    await removePopupStorage(page, authStorageKey);
    await gotoPopup(page, extensionId);

    await expect(page.locator('#sign-in-btn')).toBeVisible();
    await expect(page.locator('#user-profile')).toBeHidden();
    await expect(page.locator('#auth-loading')).toBeHidden();
  });
});
