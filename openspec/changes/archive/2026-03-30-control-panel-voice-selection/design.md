## Context

The control panel already has a speech rate slider that reads/writes `speechRate` from `chrome.storage.local`. Voice selection follows the identical pattern: the popup and options page each use `chrome.tts.getVoices()` + `chrome.storage.local` to populate a `<select>` and persist the chosen voice under the key `selectedVoice`. The background TTS handler already reads `selectedVoice` at speak-time — no background changes are needed.

## Goals / Non-Goals

**Goals:**
- Add a voice `<select>` to the control panel UI that mirrors the popup/options voice selector
- Sync selection bidirectionally with the popup and options page via `chrome.storage.onChanged`
- Reuse the existing `selectedVoice` storage key with no schema changes

**Non-Goals:**
- No changes to the popup or options page voice selector
- No changes to the background TTS handler
- No new message types — voice is resolved from storage at speak-time (current behavior)
- No voice grouping, filtering, or search UI

## Decisions

### 1. Reuse `chrome.tts.getVoices()` directly in panel-controller.ts (no shared utility)

The popup and options page each have their own `populateVoices()` inline function. The control panel will follow the same pattern rather than extracting a shared utility.

**Rationale:** The three call sites (popup, options, control panel) each live in different execution contexts (popup page, options page, content script). A shared module would need to work across all three contexts — the content script context is most constrained and cannot use the same import paths as the popup. Keeping them co-located avoids coupling. If a fourth call site appears, extraction makes sense then.

**Alternative considered:** Extract `shared/utils/voices.ts`. Rejected because content scripts and popup pages have different module resolution at bundle time, and the logic is small enough (< 15 lines) that duplication is acceptable.

### 2. Place voice selector below the speech rate section, above reading time

The speech rate slider is the most-used continuous control; voice selection is a less-frequent discrete choice. Placing it below rate and above the read-time estimate groups rate and voice together as "speech settings" while keeping the read-time indicator at the bottom.

### 3. Sync via `chrome.storage.onChanged` (same as speech rate)

The panel already subscribes to `chrome.storage.onChanged` for `speechRate`. Voice selection adds a second subscription in the same listener scope. No new infrastructure needed.

## Risks / Trade-offs

- **Risk: Voice list differs between panel creation and popup open** → Mitigation: `chrome.tts.getVoices()` is called fresh each time the panel is created, same as popup. Voices are system-level and stable during a browser session; this is acceptable.
- **Risk: Selected voice no longer available after OS voice uninstall** → Mitigation: existing fallback in background handler already handles this (falls back to default auto-selection). No new handling needed.
- **Trade-off: Duplicated `populateVoices` logic** → Accepted per Decision 1 above. The duplication is shallow (~15 lines) and avoids cross-context coupling.
