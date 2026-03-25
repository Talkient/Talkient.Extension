## Context

The text processor (`src/features/tts-playback/content/text-processor.ts`) decides whether to inject a play button next to a text node via `shouldProcessNode()`. Its final gate is a hard-coded `parent.closest('article')` check — if the text node is not inside an `<article>` element the function returns `false` regardless of any other condition.

The settings storage schema (`src/features/settings/storage-schema.ts`) holds all user preferences and their defaults. The Options page reads from and writes to `chrome.storage.local` and uses `chrome.storage.onChanged` so every content-script tab reacts to changes in real time.

## Goals / Non-Goals

**Goals:**
- Introduce a `processableElements: string[]` storage key with a sensible default set: `['article', 'p', 'h1', 'h2', 'h3', 'li']`.
- Replace the hardcoded `closest('article')` check with a dynamic check against that list.
- Expose the list as a checkbox group in the Options page so users can toggle each tag.
- React to storage changes at runtime (existing `chrome.storage.onChanged` pattern).
- Cover the new behaviour with unit tests (Jest) and at least one E2E test (Playwright).

**Non-Goals:**
- Allowing users to add arbitrary custom tag names (free-text input). Only the predefined set is configurable.
- Changing the other `shouldProcessNode` guards (hidden elements, script/style/button exclusions, word-count, etc.).
- Popup UI — configuration lives only on the Options page.

## Decisions

### D1 — Store as array of lowercase tag name strings
`processableElements: string[]` (e.g. `['article', 'p', 'h1', 'h2', 'h3', 'li']`).

**Rationale:** Simple to serialise, easy to compare with `element.tagName.toLowerCase()`, and directly maps to checkbox state (checked = in array).

**Alternative considered:** A `Record<string, boolean>` map. Rejected because an array is smaller, simpler to iterate, and avoids having to enumerate all possible keys when reading from storage.

### D2 — Replace `closest('article')` with `closestProcessable(parent, processableElements)`
A helper `closestProcessable(el, tags)` walks up the DOM and returns true if any ancestor's tagName (lowercase) is in `tags`.

**Rationale:** This is a drop-in replacement for the `closest('article')` call and is fully testable without DOM setup (the caller passes the element).

**Alternative considered:** `parent.closest(tags.join(','))` CSS selector. This works but requires tag names to be valid CSS selectors and would behave subtly differently if a user somehow stored an invalid tag name. The manual walk is safer.

### D3 — Module-level cache for `processableElements` (same pattern as `buttonPositionCache`)
The text processor already caches `buttonPosition` and `minimumWords` in module-level variables that are updated by setter functions called from the storage-change listener. We add `processableElementsCache` and `setProcessableElements()` following the exact same pattern.

**Rationale:** Consistency with existing code, zero additional complexity.

### D4 — Fixed checkbox list on the Options page (no free-text input)
The Options page renders one `<input type="checkbox">` per element in a predefined ordered list: `article, p, h1, h2, h3, li`. Checking/unchecking saves the updated array to storage immediately.

**Rationale:** Keeps the UI simple and prevents invalid tag names from breaking the selector logic.

### D5 — Default set: `['article', 'p', 'h1', 'h2', 'h3', 'li']`
This covers the most common reading-content tags while remaining conservative. `article` is included so the current behaviour is preserved by default for sites that already use it.

## Risks / Trade-offs

- **Re-processing on setting change** — When the user toggles an element, already-processed nodes in open tabs are not retroactively removed or added; only newly-visited pages (or pages that re-trigger the MutationObserver) will reflect the change. This is consistent with how all other content-processing settings behave today.
  → Mitigation: Document this in the UI as "Changes apply on next page load."

- **Performance** — Walking up the DOM for every text node is O(depth). The existing `closest('article')` already does this via a browser-native method. Our `closestProcessable` does the same but in JS. For typical DOM depths (< 30) this is negligible.
  → Mitigation: None needed for now; can be profiled later if reports emerge.

- **Empty array edge case** — If a user unchecks all elements, no play buttons appear anywhere. This is a valid user choice.
  → Mitigation: No special handling required; the behaviour is intuitive.

## Migration Plan

- Additive change: new storage key with defaults. Existing users who never visited the Options page get the default array automatically (Chrome returns `undefined` for missing keys → code falls back to `DEFAULT_SETTINGS.processableElements`).
- No data migration scripts needed.
- No manifest changes required.
