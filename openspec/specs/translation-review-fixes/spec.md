## ADDED Requirements

### Requirement: Translation close control is accessible

The translation result card SHALL expose an accessible close control with a descriptive name for assistive technologies.

#### Scenario: Screen reader announces close action

- **WHEN** a user focuses the translation card close control
- **THEN** the control exposes an accessible name that communicates closing the translation card

### Requirement: Translation background flow handles unexpected provider failures

The context-menu translation flow SHALL convert unexpected provider promise rejections into a translation error message sent to the content script.

#### Scenario: Provider rejects unexpectedly

- **WHEN** the translation provider rejects due to an unexpected runtime error
- **THEN** the service worker sends a `TRANSLATION_ERROR` message with `UNKNOWN_ERROR` and a non-empty user-facing message

### Requirement: Translation dispatch uses shared result and error typing

Background translation result dispatch SHALL use shared translation result and error code types instead of local inline unions.

#### Scenario: Shared types define dispatch contract

- **WHEN** translation result dispatch code is compiled
- **THEN** its input types are imported from shared translation/message types and no duplicate local result union is used

### Requirement: Runtime translation placement overrides fixed fallback style

Translation card placement SHALL allow runtime `left`/`top` and fallback `right`/`bottom` updates to take effect without CSS priority conflicts.

#### Scenario: Card appears near selected text

- **WHEN** selected text has a measurable anchor rectangle
- **THEN** the translation card appears near that anchor instead of being pinned to fixed bottom-right styles

### Requirement: Translation placement clamps using rendered card dimensions

Translation card horizontal clamping SHALL use rendered container width measurements instead of a stale hard-coded width constant.

#### Scenario: Width-dependent clamping stays accurate

- **WHEN** translation card width changes due to responsive or style updates
- **THEN** horizontal placement still clamps correctly within viewport margins
