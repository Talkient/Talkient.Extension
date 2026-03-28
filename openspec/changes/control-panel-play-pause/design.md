## Context

The control panel's primary button (`talkient-control-btn primary`) is rendered disabled and, when enabled by speech starting elsewhere, only supports pausing — it shows an `alert()` instead of starting playback. There is no mechanism to sync the panel icon with TTS state triggered by other surfaces (play buttons in the page, or a future popup button). The existing message flow (`SPEAK_TEXT` → SW → `SPEECH_ENDED`/`SPEECH_CANCELLED` → content) and the `setOnPlayStartCallback` hook give us the primitives we need without adding new message types.

## Goals / Non-Goals

**Goals:**
- Panel play button always enabled; clicking it when idle plays the first processable text element.
- Panel play button icon stays in sync with global TTS state (play ↔ pause) regardless of trigger source.
- No new Chrome message types; reuse existing `SPEAK_TEXT`, `PAUSE_SPEECH`, `SPEECH_ENDED`, `SPEECH_CANCELLED`, `SPEECH_ERROR`.

**Non-Goals:**
- Adding play/pause to the popup UI (separate change).
- Persisting "last played position" across page loads.
- Handling pages with zero processable elements (panel is not created in that case already).

## Decisions

### D1 — Find "top text" by querying the first rendered play button

When the panel play button is clicked and TTS is idle, call `safeClickButton` on `document.querySelector('.talkient-play-button')`. This reuses the existing play-button activation path (highlighting, `SPEAK_TEXT` message, speech rate) without duplicating logic.

**Alternative considered:** Export a `playFirstElement()` from `text-processor.ts` that finds the first processable node independently. Rejected — it would duplicate the text-selection and TTS-kick-off logic already inside the play button's click handler.

### D2 — Sync panel icon via `setOnPlayStartCallback` (play→pause) and message listener (pause→play)

`content.ts` already owns both sides:
- `setOnPlayStartCallback` fires whenever any play button triggers speech; extend the callback to also flip the panel button to the pause icon.
- The `SPEECH_ENDED` / `SPEECH_CANCELLED` / `SPEECH_ERROR` branches in `chrome.runtime.onMessage` already reset all play buttons; add one line there to flip the panel button back to the play icon.

**Alternative considered:** Have `panel-controller.ts` listen on `chrome.runtime.onMessage` itself. Rejected — it creates a second listener doing the same job as `content.ts`, making the flow harder to follow.

### D3 — Remove the `disabled` attribute from the primary button at HTML-generation time

`panel-ui.ts` hard-codes `disabled` on the button in the HTML template and `panel-controller.ts` enables it when speech starts. Since the button is always functional, remove `disabled` from `panel-ui.ts` and drop the enable-on-speech logic in `panel-controller.ts`.

### D4 — Panel icon update helper lives in `panel-controller.ts`, exported for `content.ts`

A small `updatePanelPlayIcon(state: 'play' | 'pause'): void` export keeps the DOM query and icon-swap logic co-located with the rest of the panel button logic, and lets `content.ts` import it without pulling in all of panel-controller.

## Risks / Trade-offs

- **No play buttons yet rendered** → `document.querySelector('.talkient-play-button')` returns `null`. Mitigation: guard with a null check; the panel button does nothing (play buttons may be disabled by the user). Add a `console.warn` so it's diagnosable.
- **Race between `setOnPlayStartCallback` and panel creation** → callback fires before the panel exists on very fast pages. Mitigation: `updatePanelPlayIcon` already guards with `document.getElementById('talkient-control-panel')` null check; no crash.
- **Multiple rapid clicks** → user clicks play before the first `SPEAK_TEXT` round-trip completes, triggering two speech requests. Mitigation: the SW deduplicates / cancels prior speech on each new `SPEAK_TEXT`; acceptable behavior.
