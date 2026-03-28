## Why

The control panel's play/pause button is currently inert — it shows an alert instead of starting playback, and it doesn't stay in sync with TTS state triggered from play buttons or other surfaces. Users have no way to start or pause TTS from the floating panel, making it a second-class control surface.

## What Changes

- The control panel play button starts playback of the first processable text element on the page when no TTS is active.
- The control panel play button pauses active TTS when playback is in progress.
- The panel button icon reflects live TTS state (play ↔ pause) regardless of how playback was triggered (play buttons, popup, or panel itself).
- The panel button is always enabled (not disabled) when the panel is visible, since it can now always initiate or pause playback.

## Capabilities

### New Capabilities

- `control-panel-play-pause`: Play/pause TTS from the floating control panel, including auto-selecting the first processable text when no prior playback context exists; panel icon stays in sync with global TTS state.

### Modified Capabilities

- (none — existing TTS message protocol is reused as-is; no spec-level requirement changes to other capabilities)

## Impact

- `src/features/control-panel/content/panel-controller.ts` — `setupMainControlButton` rewritten to support play-from-top and live icon sync.
- `src/features/tts-playback/content/text-processor.ts` — needs an exported helper to retrieve the first processable text node (or reuse existing element query logic).
- `src/content/content.ts` — must forward `SPEECH_ENDED` / `SPEECH_CANCELLED` / `SPEECH_ERROR` runtime messages to the panel so it can update its icon.
- `src/features/control-panel/content/panel-ui.ts` — remove `disabled` attribute from the primary button on panel creation.
- Unit tests in `src/features/control-panel/__tests__/` — add/expand coverage for play-from-top and state-sync scenarios.
- E2E test — add scenario verifying panel play button starts speech and icon toggles correctly.
