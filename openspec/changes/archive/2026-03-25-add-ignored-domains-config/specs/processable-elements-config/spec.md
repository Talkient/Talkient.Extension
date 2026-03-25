## MODIFIED Requirements

### Requirement: Text processor respects processable elements setting

The text processor `shouldProcessNode()` SHALL return `false` for any text node when the current page hostname matches an `ignoredDomains` entry. If the page is not ignored, it SHALL return `false` for any text node whose ancestor chain does not contain at least one element whose tag name (case-insensitive) is in the `processableElements` list.

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
