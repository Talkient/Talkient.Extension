## 1. Storage Schema

- [x] 1.1 Add `processableElements: string[]` to the `StorageSchema` interface in `src/features/settings/storage-schema.ts`
- [x] 1.2 Add `processableElements: ['article', 'p', 'h1', 'h2', 'h3', 'li']` to `DEFAULT_SETTINGS` in `src/features/settings/storage-schema.ts`

## 2. Text Processor

- [x] 2.1 Add `processableElementsCache: string[]` module-level variable (default `['article', 'p', 'h1', 'h2', 'h3', 'li']`) in `src/features/tts-playback/content/text-processor.ts`
- [x] 2.2 Add exported `setProcessableElements(tags: string[]): void` setter that updates the cache in `src/features/tts-playback/content/text-processor.ts`
- [x] 2.3 Replace the `parent.closest('article')` check in `shouldProcessNode()` with a DOM walk that checks if any ancestor's `tagName.toLowerCase()` is in `processableElementsCache`

## 3. Content Script Wiring

- [x] 3.1 In the content script's `chrome.storage.onChanged` handler, call `setProcessableElements()` when the `processableElements` key changes
- [x] 3.2 When the content script initialises, read `processableElements` from storage and call `setProcessableElements()` with the stored value (or the default)

## 4. Options Page — HTML

- [x] 4.1 Add a "Processable Elements" `<section>` to `src/features/settings/options/options.html` with six labelled checkboxes: `article`, `p`, `h1`, `h2`, `h3`, `li` (each with a unique `id` like `elem-article`, `elem-p`, etc.)

## 5. Options Page — CSS

- [x] 5.1 Add minimal styles for the checkbox group in `src/features/settings/options/options.css` (consistent with the existing toggle/checkbox styling)

## 6. Options Page — Logic

- [x] 6.1 In `src/features/settings/options/options-ui.ts`, query all six checkboxes by id
- [x] 6.2 Add `processableElements` to the `chrome.storage.local.get()` call that restores settings on page load
- [x] 6.3 On page load, set each checkbox's `checked` state from the stored array (default to `DEFAULT_SETTINGS.processableElements`)
- [x] 6.4 Add a `change` event listener on each checkbox that rebuilds the array from all checkbox states and calls `chrome.storage.local.set({ processableElements: [...] })`
- [x] 6.5 In the `chrome.storage.onChanged` listener, handle the `processableElements` key and update each checkbox's `checked` state

## 7. Unit Tests

- [x] 7.1 Write Jest tests for the updated `shouldProcessNode()` logic: text inside a configured element returns `true`; text outside returns `false`; empty list blocks everything; nested match works
- [x] 7.2 Write Jest tests for `setProcessableElements()`: verifies the cache update is reflected in subsequent `shouldProcessNode()` calls
- [x] 7.3 Write Jest tests for `DEFAULT_SETTINGS.processableElements`: verify it equals `['article', 'p', 'h1', 'h2', 'h3', 'li']`

## 8. E2E Tests

- [x] 8.1 Write a Playwright E2E test that opens the Options page, verifies all six checkboxes are checked by default
- [x] 8.2 Write a Playwright E2E test that unchecks one element (e.g. `h1`), verifies the storage value updates (read via `chrome.storage.local.get`) and the checkbox stays unchecked on page reload
- [x] 8.3 Run all tests (`pnpm test` and `pnpm test:e2e`) and confirm they pass without skipping, commenting out, or removing any test
