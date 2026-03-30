## Why

Users currently must open the popup or options page to change the TTS voice, interrupting their reading flow. Adding voice selection directly to the in-page control panel lets users switch voices without leaving the page, making voice selection a first-class, always-accessible control.

## What Changes

- Add a voice `<select>` dropdown to the control panel UI (between the speech rate slider and the reading time display)
- Populate the dropdown with available TTS voices on panel creation, same as popup and options page
- Persist voice selection to `chrome.storage.local` under the existing `selectedVoice` key
- Sync voice selection in real-time across control panel, popup, and options page via `chrome.storage.onChanged`

## Capabilities

### New Capabilities

- `control-panel-voice-selection`: Voice selector in the control panel that reads and writes `selectedVoice` storage key, stays in sync with popup and options page, and reflects the currently active voice on panel creation

### Modified Capabilities

<!-- No existing spec-level requirements are changing — popup and options page voice selection behavior is unchanged -->

## Impact

- `src/features/control-panel/content/panel-ui.ts` — new voice selector HTML section
- `src/features/control-panel/content/panel-controller.ts` — event listener for selector changes + storage sync listener
- `src/features/control-panel/__tests__/` — new/expanded unit tests for voice selector
- `e2e/` — new or expanded e2e test for voice selection via control panel
- No changes to popup, options page, or background TTS handler (they already read from `selectedVoice`)
