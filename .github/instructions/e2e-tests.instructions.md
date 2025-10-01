# E2E Tests Instructions for Talkient Extension

## Overview

This document provides guidelines for writing and maintaining end-to-end (E2E) tests for the Talkient Web Extension using Playwright. These tests ensure the extension works correctly in a real browser environment.

## Test Framework

- **Tool**: Playwright
- **Language**: TypeScript
- **Test Location**: `e2e/` directory
- **Configuration**: `playwright.config.ts`

## Project Rules

- **MUST** always use `pnpm` over `npm` or `yarn`
- **MUST** always use import on TypeScript files (es2016)
- **MUST** avoid changing code unless strictly necessary
- All E2E tests must use the custom test setup from `extension-test.ts`

## Running Tests

### Build and Run All Tests

```bash
pnpm test:e2e
```

## Test Structure

### Extension Test Setup

All tests MUST import from `./extension-test.ts`:

```typescript
import { test, expect } from './extension-test';
```

This provides:

- Pre-configured browser context with extension loaded
- `extensionId` fixture for accessing extension pages
- Proper extension initialization

## Best Practices

### 1. Test Isolation

Each test should be independent:

- Don't rely on state from previous tests
- Clean up after tests if needed
- Use `test.beforeEach()` for common setup

### 2. Assertions

Use meaningful assertions:

```typescript
// Good
await expect(page.locator('.status')).toHaveText('Ready');
await expect(page.locator('.button')).toBeVisible();
await expect(page.locator('.button')).toBeEnabled();

// Avoid
expect(await page.locator('.status').textContent()).toBe('Ready');
```

## Extension-Specific Patterns

### Accessing Extension URLs

```typescript
// Extension pages
await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
await page.goto(`chrome-extension://${extensionId}/options/options.html`);
```

## Test Organization

### File Naming Convention

- `feature-name.spec.ts` for feature tests
- `page-name.spec.ts` for page-specific tests
- Use descriptive names that indicate what's being tested

## Coverage Goals

Ensure tests cover:

1. ✅ Popup functionality
2. ✅ Options page and settings
3. ✅ Content script injection
4. ✅ Control panel operations
5. ✅ Web page interactions
6. ✅ Settings persistence
7. ✅ Navigation between pages
8. ✅ Edge cases and error scenarios

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/api)

## Maintenance

- Keep screenshots in `e2e-results/` for visual regression
- Update tests when features change
- Remove obsolete tests promptly
- Review and update this document as patterns evolve
