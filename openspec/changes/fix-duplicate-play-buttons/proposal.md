## Why

A single text element is getting multiple play buttons injected — sometimes as many as 5 — making the UI unusable and indicating the guard logic in `text-processor.ts` has gaps that allow re-processing of already-processed nodes.

## What Changes

- Fix the duplicate play button injection bug in `src/features/tts-playback/content/text-processor.ts`
- Strengthen the guard logic so a text element that already has a `.talkient-processed` wrapper or an adjacent `.talkient-play-button` is never processed again
- Add or update tests to cover the duplicate-injection scenario

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `processable-elements-config`: Guard behavior for already-processed elements is changing — the invariant "one play button per text element" must be enforced unconditionally

## Impact

- `src/features/tts-playback/content/text-processor.ts` — `shouldProcessNode()` and `processTextElements()` logic
- Potentially `src/content/content.ts` — if `RELOAD_PLAY_BUTTONS` handling re-runs processing without fully cleaning up first
- Unit tests for `text-processor.ts`
