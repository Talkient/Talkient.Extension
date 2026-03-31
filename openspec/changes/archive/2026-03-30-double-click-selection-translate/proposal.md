## Why

The current selection translation flow depends on the context menu, which adds friction for quick in-page translation. Users need a faster, more discoverable interaction directly near selected text.

## What Changes

- Add an inline Talkient translate trigger icon when the user selects text and performs a double left click.
- Position the trigger near the current text selection and hide it when selection is cleared or becomes invalid.
- Invoke the existing translation pipeline (`src/features/translation/`) when the user clicks the inline trigger.
- Reuse existing translation loading/success/error feedback UI in the content script.
- Add/update unit and end-to-end coverage for selection detection, trigger visibility, and click-to-translate behavior.

## Capabilities

### New Capabilities

- `inline-selection-translate-trigger`: Show and handle an inline translate icon for selected text interactions in content pages.

### Modified Capabilities

- `selection-translation`: Extend translation invocation requirements to include inline trigger interaction in addition to context menu usage.

## Impact

- Affected code: `src/content/` (selection listeners, UI trigger lifecycle), `src/features/translation/` (invocation wiring), and related tests.
- API/contracts: Existing message and translation result contracts are reused; no external API change expected.
- UX behavior: Adds a new in-page entry point for translation that complements existing context menu flow.
