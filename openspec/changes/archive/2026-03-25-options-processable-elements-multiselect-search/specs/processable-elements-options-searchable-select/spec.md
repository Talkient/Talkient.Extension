## ADDED Requirements

### Requirement: Processable elements control provides search filtering

The "Processable Elements" multi-select dropdown SHALL provide an inline search input that filters available element options by case-insensitive substring match on tag name.

#### Scenario: Search narrows visible options

- **WHEN** the user types `head` in the search input
- **THEN** only matching options (`h1`, `h2`, `h3`, `h4`, `h5`, `h6`) SHALL remain visible in the options list

#### Scenario: Clearing search restores options

- **WHEN** the user clears the search input
- **THEN** the full predefined options catalog SHALL be visible again in original order

### Requirement: Search does not alter existing selection state

Filtering visible options via search SHALL NOT add or remove selected values unless the user explicitly changes selection.

#### Scenario: Hidden selected values remain selected

- **WHEN** the user has selected `blockquote` and then searches for `h`
- **THEN** `blockquote` SHALL remain selected in control state even while filtered out from the current visible list

### Requirement: Search and selection remain synchronized with storage updates

If `processableElements` changes from external storage events while a search filter is active, the control SHALL update selection state according to storage and continue applying the current search filter to visible options.

#### Scenario: External change while filtered

- **WHEN** search text is `h` and storage updates `processableElements` to include `h4`
- **THEN** `h4` SHALL appear selected in the filtered options without clearing the active search query
