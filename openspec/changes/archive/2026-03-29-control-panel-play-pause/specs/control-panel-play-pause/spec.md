## ADDED Requirements

### Requirement: Panel play button is always enabled
The primary play/pause button in the control panel SHALL be enabled at all times when the panel is visible, regardless of whether TTS playback is active.

#### Scenario: Button enabled on panel creation
- **WHEN** the control panel is injected into the page
- **THEN** the primary play/pause button SHALL be enabled (no `disabled` attribute)

---

### Requirement: Panel play button starts playback of first text when idle
When no TTS playback is active, clicking the panel play button SHALL trigger playback of the first processable text element on the page (as determined by the rendered play buttons).

#### Scenario: Play clicked with no active TTS and play buttons present
- **WHEN** the user clicks the panel play/pause button
- **AND** TTS is not currently playing (button shows the play icon)
- **AND** at least one `.talkient-play-button` element exists in the DOM
- **THEN** the first `.talkient-play-button` SHALL be activated as if the user clicked it directly
- **AND** speech SHALL begin for that element's text

#### Scenario: Play clicked with no active TTS and no play buttons
- **WHEN** the user clicks the panel play/pause button
- **AND** TTS is not currently playing
- **AND** no `.talkient-play-button` elements exist in the DOM
- **THEN** no speech SHALL be started
- **AND** a warning SHALL be logged to the console

---

### Requirement: Panel play button pauses active TTS
When TTS playback is active, clicking the panel play button SHALL pause speech and reset the button icon to play.

#### Scenario: Pause clicked during active TTS
- **WHEN** the user clicks the panel play/pause button
- **AND** TTS is currently playing (button shows the pause icon)
- **THEN** a `PAUSE_SPEECH` message SHALL be sent to the service worker
- **AND** the panel button icon SHALL change to the play icon
- **AND** text highlighting SHALL be cleared

---

### Requirement: Panel button icon reflects live TTS state
The panel play/pause button icon SHALL stay synchronized with the global TTS playback state regardless of which surface triggered playback or cancellation.

#### Scenario: Icon updates to pause when speech starts via play button
- **WHEN** the user clicks any in-page `.talkient-play-button`
- **AND** speech begins
- **THEN** the panel primary button icon SHALL change to the pause icon

#### Scenario: Icon resets to play when speech ends normally
- **WHEN** the service worker sends a `SPEECH_ENDED` message to the content script
- **THEN** the panel primary button icon SHALL be reset to the play icon

#### Scenario: Icon resets to play when speech is cancelled
- **WHEN** the service worker sends a `SPEECH_CANCELLED` message to the content script
- **THEN** the panel primary button icon SHALL be reset to the play icon

#### Scenario: Icon resets to play when speech errors
- **WHEN** the service worker sends a `SPEECH_ERROR` message to the content script
- **THEN** the panel primary button icon SHALL be reset to the play icon
