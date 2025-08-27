# E2E tests with Playwright

### Commands

Run specific tests:

```
npx playwright test e2e/popup.spec.ts
npx playwright test e2e/options.spec.ts
npx playwright test e2e/options-detailed.spec.ts
npx playwright test e2e/options-navigation.spec.ts
```

Run all tests:

```
npx playwright test
```

Show test report:

```
npx playwright show-report
```

### Test Coverage

- **popup.spec.ts**: Tests for the extension popup functionality
- **options.spec.ts**: Basic tests for the options page settings
- **options-detailed.spec.ts**: Detailed tests for all options page functionalities
- **options-navigation.spec.ts**: Tests for navigating to the options page from various entry points
- **control-panel.spec.ts**: Tests for the control panel functionality

### Screenshots

Test screenshots are saved to the `e2e-results` folder and can be examined after test runs.
