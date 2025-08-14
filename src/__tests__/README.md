# Testing Setup

This project uses Jest for unit testing with TypeScript support.

## Setup

The testing environment is configured with:
- **Jest**: Test runner
- **ts-jest**: TypeScript support for Jest
- **jest-environment-jsdom**: DOM environment for browser API testing
- **@types/jest**: TypeScript definitions for Jest

## Configuration

- `jest.config.js`: Jest configuration file
- `src/__tests__/setup.ts`: Global test setup and mocks
- `tsconfig.json`: Includes Jest types

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Test Structure

Tests are organized in `__tests__` folders alongside the source files:

```
src/
├── content/
│   ├── content.ts
│   └── __tests__/
│       └── content.test.ts
└── __tests__/
    └── setup.ts
```

## Writing Tests

### Example Test Structure

```typescript
import { functionName } from '../source-file';

describe('functionName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test('should do something specific', () => {
    // Test implementation
    const result = functionName();
    expect(result).toBe(expectedValue);
  });
});
```

### Available Mocks

The setup file provides the following mocks:

- **Chrome API**: `chrome.runtime.sendMessage`, `chrome.runtime.onMessage`
- **Console methods**: `console.log`, `console.error`, etc.
- **Animation frames**: `requestAnimationFrame`, `cancelAnimationFrame`

### Testing DOM Elements

Since we're using jsdom, you can test DOM manipulation:

```typescript
test('should create button element', () => {
  const button = createPlayButton();
  expect(button).toBeInstanceOf(HTMLButtonElement);
  expect(button.innerHTML).toBe('▶️');
});
```

### Testing Event Handlers

```typescript
test('should handle click events', () => {
  const button = createPlayButton();
  const clickHandler = jest.fn();
  button.addEventListener('click', clickHandler);
  button.click();
  expect(clickHandler).toHaveBeenCalledTimes(1);
});
```

## Current Test Coverage

The current tests cover:

### `createPlayButton` function
- ✅ Creates a button element
- ✅ Has correct play emoji
- ✅ Has correct CSS styles
- ✅ Is clickable
- ✅ Is focusable
- ✅ Has proper button semantics

### `shouldProcessNode` function
- ✅ Returns false for null nodes
- ✅ Returns false for non-text nodes
- ✅ Returns false for empty text nodes
- ✅ Returns false for whitespace-only nodes
- ✅ Returns false for single character nodes
- ✅ Returns false for nodes in script/style/button/input tags
- ✅ Returns false if parent has play button
- ✅ Returns false if parent is already processed
- ✅ Returns true for valid text nodes

### `processTextElements` function
- ✅ Logs processing message
- ✅ Creates tree walker with correct parameters

## Adding New Tests

When adding new functions to test:

1. Export the function from the source file
2. Create test cases in the corresponding `__tests__` folder
3. Follow the existing test patterns
4. Run tests to ensure they pass
5. Update this README if needed

## Best Practices

1. **Test one thing at a time**: Each test should verify one specific behavior
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Setup and teardown**: Use `beforeEach` and `afterEach` for common setup/cleanup
4. **Mock external dependencies**: Use Jest mocks for Chrome APIs and other external dependencies
5. **Test edge cases**: Include tests for error conditions and edge cases
6. **Keep tests simple**: Tests should be easy to read and understand 