## Context

The popup (`src/popup/`) currently only provides auth controls and a link to the options page. Voice selection requires navigating away to the options page (`src/features/settings/options/`), which disrupts the user's flow. The options page already has a complete voice selector implementation using `chrome.tts.getVoices()` and `chrome.storage.local` — the popup can reuse the same pattern.

The popup is a constrained UI (240px wide, minimal height) so the voice control must fit without significant layout rework.

## Goals / Non-Goals

**Goals:**
- Add a voice `<select>` dropdown to the popup that mirrors the options page behavior
- Read the current `selectedVoice` from storage on open, persist changes on select
- Keep visual styling consistent with the existing popup aesthetic
- No shared module needed — the popup and options page can each manage their own voice logic independently

**Non-Goals:**
- Adding other settings (rate, pitch, etc.) to the popup — out of scope
- Refactoring the options page voice selector — must remain unchanged
- Sharing voice-selection logic as a reusable module — premature abstraction for two call sites

## Decisions

**Inline implementation in `popup.ts` (vs. extracting a shared module)**
The `populateVoices` function in `options-ui.ts` is ~25 lines. Extracting it into a shared utility for exactly two consumers adds an abstraction layer with minimal benefit and introduces a coupling dependency. The popup already accesses `chrome.storage.local` directly for its own purposes (auth state). Replicating the ~25-line pattern in `popup.ts` is the simpler, safer approach and consistent with project guidelines to avoid premature abstraction.

**Placement: between auth section and Settings link**
The voice selector should be visible immediately without scrolling. Placing it between the user profile area and the "Settings" link makes it contextually logical — it's a quick-access TTS control that complements but doesn't replace the full settings page.

**No loading state beyond the default `<select>` behavior**
`chrome.tts.getVoices()` is synchronous in Chrome. The callback fires immediately with an already-populated array. No spinner or async handling is needed.

## Risks / Trade-offs

- [Risk] Popup height increases, potentially requiring scroll on very small displays → Mitigation: the dropdown is compact (single `<select>`) and the popup body already uses `flex-direction: column`; vertical growth is acceptable
- [Risk] Voice list may be empty on some platforms (e.g., ChromeOS without TTS pack) → Mitigation: keep the "Default Voice" fallback option as the first entry, same as the options page

## Migration Plan

No data migration needed. The `selectedVoice` key in `chrome.storage.local` is already written by the options page, so the popup will read the same value seamlessly. Both UIs write the same key; last write wins, which is fine for a single-setting toggle.
