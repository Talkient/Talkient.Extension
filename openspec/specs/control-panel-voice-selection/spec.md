### Requirement: Control panel renders a voice selector
The control panel SHALL include a `<select>` element for voice selection, populated with available TTS voices and a "Default Voice" option, positioned in the panel's settings section.

#### Scenario: Voice selector present on panel creation
- **WHEN** the control panel is injected into the page
- **THEN** a `<select>` element with id `talkient-voice-select` SHALL be present in the panel DOM
- **AND** a "Default Voice" option (value `default`) SHALL be the first option

#### Scenario: Available voices populated on panel creation
- **WHEN** the control panel is injected into the page
- **AND** `chrome.tts.getVoices()` returns one or more voices
- **THEN** each voice SHALL appear as an `<option>` in `talkient-voice-select`
- **AND** each option's text SHALL follow the format `<voiceName> (<lang>)`

---

### Requirement: Control panel voice selector reflects current selectedVoice on creation
On panel creation, the voice selector SHALL pre-select the voice stored in `selectedVoice` storage key.

#### Scenario: Stored voice exists in available voices
- **WHEN** the control panel is injected into the page
- **AND** `selectedVoice` in storage is a non-empty string other than `default`
- **AND** that voice name appears in `chrome.tts.getVoices()`
- **THEN** `talkient-voice-select` SHALL have that voice selected

#### Scenario: Stored voice is default or not found
- **WHEN** the control panel is injected into the page
- **AND** `selectedVoice` in storage is `default` or does not match any available voice
- **THEN** `talkient-voice-select` SHALL have the "Default Voice" option selected

---

### Requirement: Changing voice in control panel persists the selection
When the user changes the voice selector in the control panel, the selection SHALL be saved to `chrome.storage.local` under the key `selectedVoice`.

#### Scenario: User selects a named voice
- **WHEN** the user changes `talkient-voice-select` to a named voice option
- **THEN** `chrome.storage.local` SHALL be updated with `{ selectedVoice: <voiceName> }`

#### Scenario: User selects default voice
- **WHEN** the user changes `talkient-voice-select` to the "Default Voice" option
- **THEN** `chrome.storage.local` SHALL be updated with `{ selectedVoice: 'default' }`

---

### Requirement: Control panel voice selector stays in sync with popup and options page
When `selectedVoice` is changed in any extension surface (popup, options page, or another control panel instance), the control panel voice selector SHALL update to reflect the new value without requiring a page reload.

#### Scenario: Voice changed in popup while control panel is open
- **WHEN** `selectedVoice` is updated in `chrome.storage.local` by any surface
- **AND** the control panel is currently visible on the page
- **THEN** `talkient-voice-select` SHALL update its selected option to match the new value
- **AND** if the new value is not in the option list, the selector SHALL fall back to "Default Voice"
