## ADDED Requirements

### Requirement: Processable elements options include broad HTML coverage

The Options page SHALL expose a predefined ordered catalog of selectable processable elements containing common text-bearing HTML tags: `article`, `main`, `section`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `li`, `ul`, `ol`, `blockquote`, `pre`, `code`, `span`, `a`, `em`, `strong`, `small`, `mark`, `cite`, `q`, `figcaption`, `caption`, `td`, `th`, `label`, `button`.

#### Scenario: User sees expanded options catalog

- **WHEN** the Options page renders the "Processable Elements" control
- **THEN** all predefined tags in the catalog SHALL be available as selectable options in the listed order

## MODIFIED Requirements

### Requirement: Options page displays processable elements selection control

The Options page SHALL render a labelled section titled "Processable Elements" using a multi-select dropdown control instead of individual checkboxes. The control SHALL represent one selectable option per element in the predefined ordered catalog of supported tags. Each option SHALL be selected if the corresponding tag is present in the stored `processableElements` array.

#### Scenario: Options page loads with default settings

- **WHEN** the Options page opens and `processableElements` equals the default value
- **THEN** only the options that are present in the default array SHALL be selected

#### Scenario: Options page loads with custom settings

- **WHEN** the Options page opens and `processableElements` is `['article', 'p', 'blockquote']`
- **THEN** only `article`, `p`, and `blockquote` options SHALL be selected and all other options SHALL be unselected

### Requirement: Updating selection persists the change to storage

The Options page SHALL save the updated `processableElements` array to `chrome.storage.local` immediately when the user changes the selected options in the multi-select dropdown.

#### Scenario: User deselects an element

- **WHEN** the user deselects the `h1` option
- **THEN** `chrome.storage.local` SHALL be updated so `'h1'` is no longer in `processableElements`

#### Scenario: User selects an element

- **WHEN** the user selects the `h2` option that was previously unselected
- **THEN** `chrome.storage.local` SHALL be updated so `'h2'` is present in `processableElements`

### Requirement: Options page reacts to external storage changes

The Options page SHALL update the multi-select control state when `chrome.storage.onChanged` fires with a new `processableElements` value (for example, from another extension context).

#### Scenario: External update reflected in control selection

- **WHEN** `processableElements` changes in storage from outside the Options page
- **THEN** the selected options in the multi-select control SHALL update to match the new value without requiring a page reload
