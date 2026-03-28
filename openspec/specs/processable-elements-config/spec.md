## ADDED Requirements

### Requirement: Default processable elements set

The system SHALL define a default set of HTML element tag names that are considered processable: `['article', 'p', 'h1', 'h2', 'h3', 'li']`. This default SHALL be stored in `DEFAULT_SETTINGS.processableElements` in the storage schema.

#### Scenario: Fresh install uses default set

- **WHEN** no `processableElements` key exists in `chrome.storage.local`
- **THEN** the text processor SHALL treat `['article', 'p', 'h1', 'h2', 'h3', 'li']` as the active set

#### Scenario: Default includes article for backwards compatibility

- **WHEN** `processableElements` equals the default value
- **THEN** text nodes inside `<article>` elements SHALL still receive play buttons (same as before this change)

---

### Requirement: Text processor respects processable elements setting

The text processor `shouldProcessNode()` SHALL return `false` for any text node when the current page hostname matches an `ignoredDomains` entry. If the page is not ignored, it SHALL return `false` for any text node whose ancestor chain does not contain at least one element whose tag name (case-insensitive) is in the `processableElements` list.

`shouldProcessNode()` SHALL additionally return `false` for any text node whose ancestor chain contains an element with the class `talkient-processed`, regardless of depth. This check SHALL be performed before the processable-elements ancestor walk.

#### Scenario: Text inside a configured element is processed

- **WHEN** current page hostname does not match `ignoredDomains`, a text node's ancestor chain contains a `<p>` element, and `'p'` is in `processableElements`
- **THEN** `shouldProcessNode()` SHALL return `true` (assuming all other guards pass)

#### Scenario: Text outside any configured element is skipped

- **WHEN** current page hostname does not match `ignoredDomains` and a text node's ancestor chain contains only a `<div>` and `'div'` is not in `processableElements`
- **THEN** `shouldProcessNode()` SHALL return `false`

#### Scenario: Text inside nested configured element is processed

- **WHEN** current page hostname does not match `ignoredDomains`, a text node lives inside `<article><p>text</p></article>`, and `'p'` is in `processableElements`
- **THEN** `shouldProcessNode()` SHALL return `true`

#### Scenario: Empty processable elements list blocks all processing

- **WHEN** current page hostname does not match `ignoredDomains` and `processableElements` is an empty array `[]`
- **THEN** `shouldProcessNode()` SHALL return `false` for every text node

#### Scenario: Ignored domain blocks processing before element checks

- **WHEN** current page hostname is `www.example.com`, `ignoredDomains` contains `example.com`, and a text node would otherwise qualify by `processableElements`
- **THEN** `shouldProcessNode()` SHALL return `false`

#### Scenario: Text inside talkient-processed ancestor is skipped

- **WHEN** a text node has an ancestor element with class `talkient-processed` at any depth
- **THEN** `shouldProcessNode()` SHALL return `false`

---

### Requirement: Processable elements cache updates on storage change

The text processor SHALL expose a `setProcessableElements(tags: string[])` function. When `chrome.storage.onChanged` fires with a new `processableElements` value, the content script SHALL call this setter so that subsequent `shouldProcessNode()` calls use the updated list.

#### Scenario: Runtime update takes effect for new nodes

- **WHEN** the user changes `processableElements` in the Options page while a tab is open
- **THEN** subsequent calls to `shouldProcessNode()` in that tab SHALL use the updated list

---

### Requirement: Options page displays processable elements checkboxes

The Options page SHALL render a labelled section titled "Processable Elements" containing one checkbox per element in the predefined ordered list: `article`, `p`, `h1`, `h2`, `h3`, `li`. Each checkbox SHALL be checked if the corresponding tag is present in the stored `processableElements` array.

#### Scenario: Options page loads with default settings

- **WHEN** the Options page opens and `processableElements` equals the default
- **THEN** all six checkboxes SHALL be checked

#### Scenario: Options page loads with custom settings

- **WHEN** the Options page opens and `processableElements` is `['article', 'p']`
- **THEN** only the `article` and `p` checkboxes SHALL be checked; the rest SHALL be unchecked

---

### Requirement: Toggling a checkbox persists the change to storage

The Options page SHALL save the updated `processableElements` array to `chrome.storage.local` immediately when the user checks or unchecks a checkbox.

#### Scenario: User unchecks an element

- **WHEN** the user unchecks the `h1` checkbox
- **THEN** `chrome.storage.local` SHALL be updated so `'h1'` is no longer in `processableElements`

#### Scenario: User re-checks an element

- **WHEN** the user checks the `h2` checkbox that was previously unchecked
- **THEN** `chrome.storage.local` SHALL be updated so `'h2'` is in `processableElements`

---

### Requirement: Options page reacts to external storage changes

The Options page SHALL update its checkbox states when `chrome.storage.onChanged` fires with a new `processableElements` value (e.g. from another tab or sync).

#### Scenario: External update reflected in UI

- **WHEN** `processableElements` changes in storage from outside the Options page
- **THEN** the checkboxes SHALL update to match the new value without a page reload

---

### Requirement: Play button injection is idempotent per text element

The system SHALL ensure that each text element receives at most one play button, regardless of how many times `processTextElements()` is called on the same page.

#### Scenario: Single processing run produces one button per element

- **WHEN** `processTextElements()` is called once on a page with qualifying text nodes
- **THEN** each qualifying text node SHALL receive exactly one `.talkient-play-button` element

#### Scenario: Re-processing after settings change does not duplicate buttons

- **WHEN** a setting changes (e.g. buttonPosition, minimumWords) and `processTextElements()` is called again after `removeTalkientUiElements()`
- **THEN** each text element SHALL have exactly one `.talkient-play-button` and no nested `.talkient-processed` wrappers

#### Scenario: Multiple RELOAD_PLAY_BUTTONS messages do not stack buttons

- **WHEN** `RELOAD_PLAY_BUTTONS` is received multiple times in quick succession
- **THEN** each qualifying text node SHALL have exactly one play button after all processing completes

---

### Requirement: removeTalkientUiElements fully restores original DOM structure

When removing Talkient UI elements, the system SHALL unwrap every `<span class="talkient-processed">` wrapper so that the original text node is returned to its original parent, leaving no orphaned wrapper spans in the DOM.

#### Scenario: Wrapper spans are removed after cleanup

- **WHEN** `removeTalkientUiElements()` is called after `processTextElements()` has run
- **THEN** no elements with class `talkient-processed` SHALL remain in the DOM

#### Scenario: Text content is preserved after cleanup

- **WHEN** `removeTalkientUiElements()` is called
- **THEN** the visible text content of the page SHALL be identical to what it was before `processTextElements()` was called
