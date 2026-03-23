## Why

PR #18 introduces translation UI and background flow, and Copilot identified review issues that can impact accessibility, runtime reliability, and positioning behavior. Addressing these now reduces regression risk before wider rollout and keeps translation behavior consistent with project quality standards.

## What Changes

- Improve translation card accessibility by making the close control screen-reader friendly.
- Add defensive error handling to translation execution in the context-menu background flow to avoid unhandled promise rejections.
- Align translation result typing in context-menu messaging with shared translation/message types to reduce type drift.
- Fix translation card positioning interactions between CSS and runtime inline styles.
- Remove hard-coded width assumptions from translation card placement logic by using measured element dimensions.

## Capabilities

### New Capabilities

- `translation-review-fixes`: Follow-up hardening for translation UI and background messaging based on PR review feedback.

### Modified Capabilities

- None.

## Impact

- Affected code: `src/content/translation-result.ts`, `src/content/content.css`, `src/features/tts-playback/background/context-menu.ts`, and related tests.
- APIs/messages: No new public APIs; internal message/error handling and typing consistency are improved.
- Dependencies/systems: No new external dependencies; behavior changes are limited to extension content/background runtime.
