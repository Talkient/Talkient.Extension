## Why

Users can already listen to selected text, but they cannot quickly translate it in-page. Adding a right-click translate action reduces friction for multilingual reading workflows and aligns Talkient with a common browser-extension expectation.

## What Changes

- Add a context menu item for selected text that triggers a translation flow from the extension.
- Detect selected text at invocation time and send it to a translation service adapter.
- Show translation result in an extension-managed UI surface (popup panel or injected lightweight result card) with error states.
- Add unit tests for translation command handling, request/response parsing, and failure handling.
- Add E2E coverage validating right-click selection -> translate action -> rendered translation result.

## Capabilities

### New Capabilities

- `selection-translation`: Translate user-selected text from the browser context menu and present result feedback in the page/extension UI.

### Modified Capabilities

## Impact

- Affected extension components: service worker/background handlers, context menu wiring, messaging bridge, and translation result UI.
- New/updated tests in Jest (unit) and Playwright (E2E).
- Potential new permission usage and manifest updates related to context menus and host access for translation requests.
- Introduces translation provider abstraction to keep provider-specific logic isolated.
