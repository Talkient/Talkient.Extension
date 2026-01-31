---
name: talkient-tester
description: Create, execute, and maintain unit and E2E tests following best practices
compatibility: opencode
---

# Test Creator & Executor Skill

This skill creates meaningful tests and ensures test integrity. **NEVER skip, comment out, or delete failing tests.** Always fix the root cause.

## Core Principles

1. **Fix root causes** - When a test fails, investigate and fix the actual issue in the code or test setup, not by removing/skipping the test.
2. **Meaningful coverage** - Write tests that validate behavior, not just cover lines.
3. **Isolation** - Each test must be independent and not rely on other tests' state.
4. **Readability** - Tests serve as documentation; keep them clear and descriptive.

## Test Commands

```bash
# Run unit tests (Jest)
pnpm test

# Run specific unit test file
pnpm test -- path/to/file.test.ts

# Run E2E tests (Playwright)
pnpm test:e2e

# Run specific E2E test file
pnpm test:e2e path/to/file.spec.ts

# Run E2E tests with UI (for debugging)
pnpm test:e2e --ui
```

## Mandatory Workflow

1. **After ANY code change**: Run `pnpm test` AND `pnpm test:e2e`
2. **E2E flakiness**: If E2E tests fail, run them **twice** before investigating (they can be intermittent)
3. **Never skip tests**: Use `test.skip` or `describe.skip` ONLY temporarily during development, never commit them

---

## Unit Tests (Jest)

### Location & Naming

- Unit tests: `src/**/__tests__/*.test.ts`
- Test file naming: `<source-file>.test.ts` (e.g., `content.test.ts` for `content.ts`)

### Structure Template

```typescript
import { functionToTest } from '../source-file';
// Import mocks and test utilities
import { mockFunction } from '../../__tests__/mocks/chrome-mock';
import { TEST_TEXT, CSS_CLASSES } from '../../__tests__/test-constants';
import { createTextInArticle } from '../../__tests__/builders/dom-builder';

// Mock dependencies BEFORE imports that use them
jest.mock('../runtime-utils', () => ({
  safeSendMessage: jest.fn(),
  isExtensionContextValid: jest.fn(() => true),
}));

describe('functionToTest', () => {
  beforeEach(() => {
    // Reset DOM and mocks before each test
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('should [expected behavior] when [condition]', () => {
    // Arrange: Set up test data
    const { article, textNode } = createTextInArticle(
      TEST_TEXT.VALID_PARAGRAPH,
    );
    document.body.appendChild(article);

    // Act: Execute the function
    const result = functionToTest(textNode);

    // Assert: Verify the outcome
    expect(result).toBe(expectedValue);
  });

  test('should handle edge case: [description]', () => {
    // Edge case tests are critical for robustness
  });
});
```

### Available Test Utilities

**DOM Builders** (`src/__tests__/builders/dom-builder.ts`):

- `createArticleWithParagraphs(count, options)` - Create article with paragraphs
- `createTextInContainer(text, containerTag)` - Create text in any container
- `createTextInArticle(text)` - Create text in article structure (expected structure)

**Test Constants** (`src/__tests__/test-constants.ts`):

- `TEST_TEXT.*` - Standard test text values (VALID_PARAGRAPH, SINGLE_WORD, EMPTY, etc.)
- `CSS_CLASSES.*` - Extension CSS class names
- `MOCK_VALUES.*` - Mock configuration values

**Chrome Mock** (`src/__tests__/mocks/chrome-mock.ts`):

- Pre-configured Chrome API mocks
- `resetChromeMock()` - Reset between tests (called automatically in setup)

### Best Practices for Unit Tests

1. **Use descriptive test names**: `"should create button with play icon when called"` not `"test button"`
2. **One assertion focus per test**: Test one behavior, but multiple related assertions are OK
3. **Use builders for DOM**: Don't manually create HTML strings
4. **Mock external dependencies**: Chrome APIs, fetch, timers
5. **Test edge cases**: Empty strings, null, undefined, boundary values

---

## E2E Tests (Playwright)

### Location & Naming

- E2E tests: `e2e/*.spec.ts`
- Test pages: `e2e/test-pages/*.html`
- Helper utilities: `e2e/test-utils/helpers.ts`
- Constants: `e2e/test-utils/constants.ts`

### Structure Template

```typescript
import { test, expect } from './extension-test';
import * as path from 'path';
import * as fs from 'fs';
import { SELECTORS, TIMEOUTS } from './test-utils/constants';
import {
  waitForPlayButtons,
  waitForControlPanel,
  expandControlPanel,
  takeScreenshot,
  triggerReprocessing,
} from './test-utils/helpers';

test.describe('Feature Name', () => {
  const testHtmlPath = path.resolve(__dirname, 'test-pages/your-test.html');
  const testPageUrl = `file://${testHtmlPath.replace(/\\/g, '/')}`;

  test.beforeAll(() => {
    // Verify test page exists
    expect(
      fs.existsSync(testHtmlPath),
      `Test page not found: ${testHtmlPath}`,
    ).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(testPageUrl);
    await page.waitForLoadState('networkidle');
  });

  test('should [expected behavior]', async ({ page }) => {
    // Wait for extension to initialize
    await waitForPlayButtons(page);

    // Interact with the page
    const button = page.locator(SELECTORS.PLAY_BUTTON).first();
    await button.click();

    // Assert outcomes
    await expect(button).toBeVisible();

    // Take screenshot for debugging (optional)
    await takeScreenshot(page, 'test-screenshot-name');
  });
});
```

### Available E2E Helpers (`e2e/test-utils/helpers.ts`)

- `waitForPlayButtons(page, { minCount?, timeout? })` - Wait for play buttons to appear
- `waitForControlPanel(page, { expanded? })` - Wait for control panel
- `expandControlPanel(page)` - Expand the control panel
- `triggerReprocessing(page)` - Trigger extension to reprocess page
- `takeScreenshot(page, name)` - Save screenshot for debugging

### Available Selectors (`e2e/test-utils/constants.ts`)

```typescript
SELECTORS.PLAY_BUTTON; // ".talkient-play-button"
SELECTORS.CONTROL_PANEL; // "#talkient-control-panel"
SELECTORS.CONTROL_PANEL_COLLAPSED;
SELECTORS.CONTROL_PANEL_EXPANDED;
SELECTORS.PANEL_TOGGLE;
SELECTORS.SETTINGS_BUTTON;
SELECTORS.STOP_BUTTON;
SELECTORS.RATE_SLIDER;
// ... and more
```

### Best Practices for E2E Tests

1. **Always use helper functions**: Don't duplicate wait logic
2. **Use SELECTORS constants**: Never hardcode CSS selectors
3. **Wait properly**: Use `waitForPlayButtons()` instead of arbitrary `waitForTimeout()`
4. **Handle flakiness**: E2E tests interact with real browser - add appropriate waits
5. **Create dedicated test pages**: Each test scenario should have its own HTML file in `e2e/test-pages/`
6. **Take screenshots on failures**: Use `takeScreenshot()` for debugging

---

## Creating New Test Pages

When testing a new feature, create a dedicated HTML test page:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Feature Name Test Page</title>
  </head>
  <body>
    <article>
      <h1>Test Page for Feature Name</h1>
      <p>
        Paragraph with enough words to be processed by the extension for testing
        purposes.
      </p>
      <p>Another paragraph to test multiple elements behavior.</p>
    </article>
  </body>
</html>
```

Save to: `e2e/test-pages/feature-name-test.html`

---

## Debugging Failing Tests

### Unit Test Failures

1. Run single test: `pnpm test -- --testNamePattern="test name"`
2. Enable console output: Uncomment console lines in `src/__tests__/setup.ts`
3. Check mock setup: Ensure Chrome APIs are properly mocked

### E2E Test Failures

1. Run with UI: `pnpm test:e2e --ui`
2. Check screenshots in `playwright-report/` and `test-results/`
3. Run headed: Remove `--headless=new` temporarily
4. Add debug pauses: `await page.pause()` to inspect state
5. Check extension loaded: Verify `dist/` folder exists (`pnpm build`)

---

## Forbidden Practices

❌ **NEVER do these:**

```typescript
// DON'T skip tests to hide failures
test.skip("broken test", () => { ... });

// DON'T comment out failing tests
// test("this was failing", () => { ... });

// DON'T delete tests that are "inconvenient"

// DON'T use arbitrary timeouts instead of proper waits
await page.waitForTimeout(5000); // BAD

// DON'T hardcode selectors
await page.click(".talkient-play-button"); // BAD - use SELECTORS.PLAY_BUTTON
```

✅ **ALWAYS do these instead:**

```typescript
// DO fix the root cause of test failures

// DO use proper async waits
await waitForPlayButtons(page); // GOOD

// DO use constants for selectors
await page.locator(SELECTORS.PLAY_BUTTON).click(); // GOOD

// DO investigate flaky tests and add proper synchronization
```

---

## Checklist Before Committing

- [ ] All unit tests pass: `pnpm test`
- [ ] All E2E tests pass: `pnpm test:e2e` (run twice if intermittent)
- [ ] No skipped or commented tests
- [ ] New code has corresponding tests
- [ ] Test names are descriptive
- [ ] Edge cases are covered
