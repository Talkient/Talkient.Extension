## 1. Manifest and command wiring

- [x] 1.1 Add or update MV3 permissions and manifest entries required for context-menu translation flow.
- [x] 1.2 Register the selection-only translate context menu item in the service worker startup path.
- [x] 1.3 Implement context menu click handling to capture selected text and active tab metadata.

## 2. Translation pipeline implementation

- [x] 2.1 Create a translation provider adapter interface and default provider implementation.
- [x] 2.2 Add normalization for provider success/error responses into a consistent internal payload.
- [x] 2.3 Connect service worker handler to call the adapter and dispatch results over extension messaging.

## 3. User feedback UI

- [x] 3.1 Implement content-side translation result UI container with isolated styling.
- [x] 3.2 Render translated text, source/target language metadata, and loading/success states.
- [x] 3.3 Render failure state with actionable recovery guidance for timeout/provider errors.

## 4. Automated tests

- [x] 4.1 Add Jest unit tests for context menu orchestration and selected-text command routing.
- [x] 4.2 Add Jest unit tests for provider adapter normalization and error mapping.
- [x] 4.3 Add Playwright E2E test covering select text -> right-click translate -> translation result visible.

## 5. Validation and documentation

- [x] 5.1 Verify lint/test suites pass (`pnpm test` and relevant E2E command) for translation changes.
- [x] 5.2 Document configuration assumptions (provider endpoint, target language behavior, permissions rationale).
- [x] 5.3 Perform manual smoke test on a sample page to validate context menu visibility and error handling.
