## MODIFIED Requirements

### Requirement: Translate action for selected text

The extension SHALL provide translation actions for non-empty selected text through both the context menu and an inline Talkient trigger shown after eligible in-page selection interactions.

#### Scenario: Context menu appears for selection

- **WHEN** a user selects text on a supported page and opens the right-click menu
- **THEN** the extension translation action is visible and enabled

#### Scenario: Context menu hidden without selection

- **WHEN** a user opens the right-click menu without selected text
- **THEN** the extension translation action is not shown or is disabled

#### Scenario: Inline trigger appears for double-click selection

- **WHEN** a user double left clicks selectable page text and the selection is non-empty
- **THEN** the extension shows an inline Talkient translation trigger near the selection

#### Scenario: Inline trigger invokes translation

- **WHEN** the user clicks the inline Talkient translation trigger
- **THEN** the extension starts translation for the current selected text
