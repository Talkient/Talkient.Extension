## 1. Expand processable elements configuration

- [x] 1.1 Add and export a curated ordered catalog of supported processable HTML tags shared by settings defaults and options UI.
- [x] 1.2 Keep `DEFAULT_SETTINGS.processableElements` backward-compatible while validating/normalizing stored values against the supported catalog.
- [x] 1.3 Add or update unit tests that verify defaults, allowed options coverage, and normalization behavior for unknown tags.

## 2. Replace options UI with searchable multi-select

- [x] 2.1 Replace the checkbox-based "Processable Elements" UI with a multi-select dropdown bound to `processableElements` storage.
- [x] 2.2 Implement immediate persistence when multi-select selection changes and preserve selected state across page loads.
- [x] 2.3 Keep options UI synchronized with `chrome.storage.onChanged` updates from external extension contexts.

## 3. Add search behavior for element selection

- [x] 3.1 Add a search input tied to the processable-elements multi-select with case-insensitive substring filtering.
- [x] 3.2 Ensure filtering does not mutate selected values unless the user explicitly changes selection.
- [x] 3.3 Ensure external storage updates correctly refresh selection state while an active search query remains applied.

## 4. Verify and harden behavior

- [x] 4.1 Update Jest tests for options rendering, persistence, external updates, and search filtering scenarios.
- [x] 4.2 Add or update E2E coverage to validate multi-select interactions and searchable selection on the options page.
- [x] 4.3 Run project checks (`pnpm test` and relevant E2E command) and fix any regressions before marking the change complete.
