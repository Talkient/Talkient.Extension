## Why

Text-to-speech play buttons are currently only injected into `<article>` elements, with no user control over which HTML elements are considered "processable." Users reading content on sites that structure text inside `<section>`, `<main>`, `<div>`, or other containers cannot use Talkient's play buttons at all, limiting the extension's usefulness.

## What Changes

- Remove the hardcoded `<article>`-only restriction in the text processor.
- Add a new `processableElements` setting (array of tag names) to the storage schema with sensible defaults.
- Add a new **Processable Elements** section to the Options page with a checklist UI — users can enable/disable each element tag.
- The text processor reads `processableElements` from storage (with live reload on change) and applies the list when deciding whether to inject a play button.
- Unit tests for the storage default and the `shouldProcessNode` logic change.
- E2E test for the Options page checklist (toggle an element off, verify buttons no longer appear on that element type).

## Capabilities

### New Capabilities

- `processable-elements-config`: User-configurable list of HTML element tags that Talkient considers when deciding where to inject play buttons.

### Modified Capabilities

_(none — no existing spec files are changing their requirements)_

## Impact

- **`src/features/settings/storage-schema.ts`** — new `processableElements` field + default value.
- **`src/features/tts-playback/content/text-processor.ts`** — replace `closest('article')` check with a dynamic lookup against `processableElements`.
- **`src/features/settings/options/options.html`** — new Processable Elements section with checkboxes.
- **`src/features/settings/options/options-ui.ts`** — read/write `processableElements` setting.
- **`src/features/settings/options/options.css`** — minor styling for checkbox list.
- **Tests** — new Jest unit tests; new or extended Playwright E2E test.
