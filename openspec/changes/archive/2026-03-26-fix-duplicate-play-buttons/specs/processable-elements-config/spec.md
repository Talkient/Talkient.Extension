## MODIFIED Requirements

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

## ADDED Requirements

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
