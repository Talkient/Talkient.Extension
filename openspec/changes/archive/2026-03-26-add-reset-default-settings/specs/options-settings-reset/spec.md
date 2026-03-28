## ADDED Requirements

### Requirement: User can reset all settings to defaults from options page

The options page SHALL provide a `Reset to default settings` control that restores all user-configurable extension settings to their canonical default values in a single action.

#### Scenario: Reset control is available

- **WHEN** the user opens the options page
- **THEN** the page shows a `Reset to default settings` action that is accessible by keyboard and screen reader name

#### Scenario: User confirms reset

- **WHEN** the user activates `Reset to default settings` and confirms the reset action
- **THEN** the extension writes canonical default values for all supported settings to persistent storage
- **AND** the options page updates visible controls to match the default values

#### Scenario: User cancels reset

- **WHEN** the user activates `Reset to default settings` and cancels the confirmation prompt
- **THEN** no settings values are changed in persistent storage
- **AND** current option control values remain unchanged in the UI

### Requirement: Reset behavior is covered by automated tests

The extension SHALL include automated test coverage for reset-to-default behavior to ensure regressions are detected.

#### Scenario: Unit test validates reset persistence behavior

- **WHEN** reset logic is executed in unit tests with a mocked storage layer
- **THEN** tests verify that canonical defaults are written on confirm
- **AND** tests verify that no write occurs when reset is canceled

#### Scenario: End-to-end test validates user flow

- **WHEN** end-to-end tests run the options reset interaction
- **THEN** tests verify the reset action can be triggered, confirmation is required, and resulting values shown in UI match defaults after confirmation
