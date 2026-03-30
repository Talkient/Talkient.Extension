## 1. Remove disabled state from panel button

- [x] 1.1 In `src/features/control-panel/content/panel-ui.ts`, remove the `disabled` attribute from the primary play/pause button in the HTML template
- [x] 1.2 In `src/features/control-panel/content/panel-controller.ts` `setupMainControlButton`, remove the code that enables the rate slider or the button on speech start (button is always enabled now)

## 2. Export panel icon update helper

- [x] 2.1 In `src/features/control-panel/content/panel-controller.ts`, add and export `updatePanelPlayIcon(state: 'play' | 'pause'): void` that queries `#talkient-control-panel .talkient-control-btn.primary` and sets its innerHTML using `getSvgIcon`

## 3. Implement play-from-top in panel click handler

- [x] 3.1 In `src/features/control-panel/content/panel-controller.ts` `setupMainControlButton`, replace the `alert(...)` branch: when the panel icon is play, query `document.querySelector('.talkient-play-button')` and call `safeClickButton` on it; if null, log a console warning
- [x] 3.2 Import `safeClickButton` from `../../tts-playback/content/play-button` in `panel-controller.ts`

## 4. Sync icon when playback starts from any surface

- [x] 4.1 In `src/content/content.ts`, import `updatePanelPlayIcon` from `../features/control-panel/content/panel-controller`
- [x] 4.2 In the `setOnPlayStartCallback` callback in `content.ts`, call `updatePanelPlayIcon('pause')` after `updateRemainingTimeDisplay()`

## 5. Sync icon when playback ends / cancels / errors

- [x] 5.1 In `src/content/content.ts`, in the `SPEECH_ENDED` handler, call `updatePanelPlayIcon('play')` after resetting play buttons
- [x] 5.2 In `src/content/content.ts`, in the `SPEECH_CANCELLED` handler, call `updatePanelPlayIcon('play')` after resetting play buttons
- [x] 5.3 In `src/content/content.ts`, in the `SPEECH_ERROR` handler, call `updatePanelPlayIcon('play')` after resetting play buttons

## 6. Unit tests — panel-controller

- [x] 6.1 In `src/features/control-panel/__tests__/control-panel.test.ts`, add a test verifying the panel primary button is enabled (no `disabled` attribute) immediately after `createControlPanel()`
- [x] 6.2 Add a test: clicking the panel play button when icon shows play and a `.talkient-play-button` exists → `safeClickButton` is called on that element
- [x] 6.3 Add a test: clicking the panel play button when icon shows play and no `.talkient-play-button` exists → no error thrown, a console.warn is emitted
- [x] 6.4 Add a test: clicking the panel play button when icon shows pause → `safeSendMessage` is called with `{ type: 'PAUSE_SPEECH' }` and panel icon resets to play
- [x] 6.5 Add a test: `updatePanelPlayIcon('pause')` sets the panel button to the pause SVG; `updatePanelPlayIcon('play')` sets it back to the play SVG

## 7. Unit tests — icon sync via content.ts message handler

- [x] 7.1 In an existing or new test file under `src/features/control-panel/__tests__/`, add tests simulating `SPEECH_ENDED`, `SPEECH_CANCELLED`, and `SPEECH_ERROR` messages and asserting the panel button icon is reset to play via `updatePanelPlayIcon`

## 8. E2E test

- [x] 8.1 In the appropriate Playwright spec file, add an E2E scenario that:
  - Navigates to a page with processable text
  - Waits for the control panel to appear and expand it
  - Clicks the panel play button
  - Asserts speech is started (e.g., panel button switches to pause icon)
  - Clicks the panel play button again
  - Asserts speech is paused (panel button reverts to play icon)

## 9. Verification

- [x] 9.1 Run `pnpm test` and confirm all unit tests pass with no skips
- [x] 9.2 Run `pnpm test:e2e` and confirm the new E2E scenario passes
