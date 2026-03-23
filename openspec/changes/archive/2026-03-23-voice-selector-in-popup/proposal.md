## Why

Users frequently need to switch voices without leaving the current page, but the voice selector is currently only accessible in the full options page. Adding it directly to the popup allows faster access without interrupting the browsing workflow.

## What Changes

- Add a voice `<select>` dropdown to `popup.html` that lists all available TTS voices
- Add logic in `popup.ts` to populate voices from `chrome.tts.getVoices()`, load the saved voice from `chrome.storage.local`, and persist changes on selection
- The options page voice selector remains unchanged

## Capabilities

### New Capabilities
- `popup-voice-selector`: A voice selection dropdown in the popup UI that reads/writes `selectedVoice` to `chrome.storage.local`, mirroring the existing options page behavior

### Modified Capabilities
<!-- none -->

## Impact

- `src/popup/popup.html` — new `<select>` element added
- `src/popup/popup.ts` — new voice population + storage read/write logic
- `src/popup/popup.css` — minor styling for the dropdown
- No changes to the options page, storage schema, or background service worker
