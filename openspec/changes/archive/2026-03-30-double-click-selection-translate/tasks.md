## 1. Translation Orchestration Refactor

- [x] 1.1 Extract the shared selection-translation execution logic from `src/features/tts-playback/background/context-menu.ts` into a reusable function in `src/features/translation/`.
- [x] 1.2 Update context-menu translation click handling to call the shared translation execution function without changing existing behavior.
- [x] 1.3 Add/update unit tests for the shared translation execution function covering loading, success, empty text, and unknown-error mapping.

## 2. Inline Trigger UI in Content Script

- [x] 2.1 Implement an inline Talkient translate trigger component under `src/content/` that can render near the active selection and expose show/hide lifecycle helpers.
- [x] 2.2 Add double-left-click selection handling in `src/content/content.ts` to validate selected text and display the inline trigger only for valid non-empty selections.
- [x] 2.3 Add selection-change, outside-click, and invalid-geometry cleanup logic so the inline trigger is removed whenever selection context is no longer valid.

## 3. Inline Trigger Translation Wiring

- [x] 3.1 Wire inline trigger click handling in `src/content/content.ts` to send a translation command using the current selected text through the existing background translation pipeline.
- [x] 3.2 Ensure the inline trigger is disabled/removed immediately after click to prevent duplicate requests until a new eligible selection is made.
- [x] 3.3 Verify translation loading/result/error messages continue to render via the existing `src/content/translation-result.ts` UI for inline-triggered requests.

## 4. Automated Verification

- [x] 4.1 Add content-script unit tests for inline trigger visibility rules, positioning fallback behavior, and cleanup lifecycle.
- [x] 4.2 Add/extend background translation tests to validate inline-triggered translation uses the same provider and message contract as context-menu translation.
- [x] 4.3 Add or update Playwright E2E coverage for the user flow: double-click text selection -> inline Talkient trigger appears -> click trigger -> translation result or error is shown.
