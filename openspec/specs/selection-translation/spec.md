## ADDED Requirements

### Requirement: Translate action for selected text

The extension SHALL register a context menu action that is available when the user has selected non-empty text on a page.

#### Scenario: Context menu appears for selection

- **WHEN** a user selects text on a supported page and opens the right-click menu
- **THEN** the extension translation action is visible and enabled

#### Scenario: Context menu hidden without selection

- **WHEN** a user opens the right-click menu without selected text
- **THEN** the extension translation action is not shown or is disabled

### Requirement: Translation execution pipeline

The extension MUST send the selected text to a translation provider adapter and return either a translated result or a structured error.

#### Scenario: Successful translation response

- **WHEN** the user triggers translate on selected text and the provider responds successfully
- **THEN** the extension receives a normalized translation payload containing original text, translated text, and language metadata

#### Scenario: Provider error response

- **WHEN** the user triggers translate and the provider request fails or times out
- **THEN** the extension receives a normalized error payload with an error code and user-safe message

### Requirement: Translation feedback UI

The extension SHALL present translation output in an extension-managed UI surface on the active page and SHALL show an error state when translation fails.

#### Scenario: Render translated content

- **WHEN** translation succeeds for the selected text
- **THEN** the active page shows the translated text in the extension result UI

#### Scenario: Render failure feedback

- **WHEN** translation fails for the selected text
- **THEN** the active page shows an error message and recovery guidance in the extension result UI

### Requirement: Automated verification coverage

The project MUST include automated tests for the selection translation feature using both unit and end-to-end layers.

#### Scenario: Unit tests validate translation orchestration

- **WHEN** unit tests execute for translation command logic
- **THEN** they verify context menu handling, provider adapter interaction, payload normalization, and error mapping

#### Scenario: End-to-end test validates user workflow

- **WHEN** E2E tests run in browser automation
- **THEN** they validate selected text right-click translate invocation and visible result or error feedback
