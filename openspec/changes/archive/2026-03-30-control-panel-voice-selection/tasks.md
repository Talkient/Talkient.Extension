## 1. Panel UI

- [x] 1.1 Add voice selector HTML section to `panel-ui.ts` — `<label>` + `<select id="talkient-voice-select">` inserted after the speech rate section
- [x] 1.2 Export any new element IDs or selectors needed by tests from `panel-ui.ts`

## 2. Panel Controller

- [x] 2.1 In `panel-controller.ts`, add `populateVoices()` helper that calls `chrome.tts.getVoices()` and builds options (Default Voice + named voices in `<voiceName> (<lang>)` format)
- [x] 2.2 Call `populateVoices()` during `setupControlPanelEventListeners()`, pre-selecting the stored `selectedVoice`
- [x] 2.3 Add `change` event listener on `talkient-voice-select` that writes `{ selectedVoice }` to `chrome.storage.local`
- [x] 2.4 Add `chrome.storage.onChanged` subscription for `selectedVoice` that updates the selector's current value (falling back to `default` if the new value is not in the option list)

## 3. Unit Tests

- [x] 3.1 In `control-panel.test.ts` (or a new `voice-selector.test.ts`), mock `chrome.tts.getVoices` and assert `talkient-voice-select` is present after `createControlPanel()`
- [x] 3.2 Assert that the "Default Voice" option (value `default`) is always the first option
- [x] 3.3 Assert that voices returned by `chrome.tts.getVoices` appear as options with the correct label format
- [x] 3.4 Assert that the stored `selectedVoice` is pre-selected on panel creation (both named-voice and `default` cases)
- [x] 3.5 Assert that changing the selector dispatches `chrome.storage.local.set` with the correct `selectedVoice`
- [x] 3.6 Assert that a `storage.onChanged` event for `selectedVoice` updates the selector value
- [x] 3.7 Assert fallback to `default` when the new `selectedVoice` value is not in the option list

## 4. E2E Tests

- [x] 4.1 In `e2e/control-panel.spec.ts` (or a new file), add a test that opens the options page, selects a non-default voice, navigates to a test page, and verifies the control panel selector shows that voice
- [x] 4.2 Add a test that changes the voice via the control panel selector and verifies the popup voice selector reflects the new selection
- [x] 4.3 Verify that after changing voice in the control panel, the next TTS playback uses the selected voice (check that `chrome.tts.speak` is called — or observe no error when speaking)
