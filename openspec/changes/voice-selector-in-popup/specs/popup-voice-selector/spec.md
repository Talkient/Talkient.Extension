## ADDED Requirements

### Requirement: Voice selector visible in popup
The popup SHALL display a `<select>` dropdown listing all available TTS voices, positioned between the auth section and the Settings link.

#### Scenario: Voices populated on popup open
- **WHEN** the popup is opened
- **THEN** the voice dropdown SHALL be populated with all voices returned by `chrome.tts.getVoices()`, each formatted as `<voiceName> (<lang>)`, with a "Default Voice" option as the first entry

#### Scenario: Current voice pre-selected
- **WHEN** the popup is opened and `selectedVoice` exists in `chrome.storage.local`
- **THEN** the dropdown SHALL have the matching voice option selected

#### Scenario: Default selected when no saved voice
- **WHEN** the popup is opened and `selectedVoice` is not set in storage
- **THEN** the dropdown SHALL have "Default Voice" selected

### Requirement: Voice selection persisted from popup
The popup SHALL persist the user's voice choice to `chrome.storage.local` under the key `selectedVoice` immediately on change.

#### Scenario: User changes voice
- **WHEN** the user selects a different voice in the popup dropdown
- **THEN** `chrome.storage.local.set({ selectedVoice: <selected value> })` SHALL be called

#### Scenario: Selection reflected on options page
- **WHEN** the user changes the voice in the popup
- **THEN** the options page voice selector SHALL show the same voice on next open (shared storage key)
