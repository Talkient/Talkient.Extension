## ADDED Requirements

### Requirement: Inline translate trigger appears on double-click text selection

The content script SHALL render an inline Talkient translate trigger when a user performs a double left click that results in a non-empty text selection.

#### Scenario: Show trigger for valid double-click selection

- **WHEN** a user double left clicks text and the page has a non-collapsed selection range
- **THEN** the extension displays a Talkient inline translate trigger near the selected text

#### Scenario: Do not show trigger for invalid selection state

- **WHEN** a double left click occurs but the selection is empty, collapsed, or has no usable geometry
- **THEN** the extension does not render the inline translate trigger

### Requirement: Inline translate trigger lifecycle management

The content script MUST remove or hide the inline translate trigger when the selection context is no longer valid.

#### Scenario: Remove trigger when selection is cleared

- **WHEN** the user clears the selection or the selection collapses
- **THEN** the inline translate trigger is removed from the page

#### Scenario: Remove trigger after translation is initiated

- **WHEN** the user clicks the inline translate trigger
- **THEN** the trigger is hidden or removed before the translation request is processed

### Requirement: Inline trigger invokes existing translation flow

Clicking the inline translate trigger SHALL invoke the existing selection translation orchestration so translation loading, success, and error feedback use the established UI flow.

#### Scenario: Trigger click starts translation request

- **WHEN** the user clicks the inline translate trigger for a valid selected text
- **THEN** the extension sends a translation request using the selected text and current translation settings

#### Scenario: Trigger click displays translation feedback

- **WHEN** inline-triggered translation succeeds or fails
- **THEN** the extension displays the same loading/result/error states used by the selection translation feature
