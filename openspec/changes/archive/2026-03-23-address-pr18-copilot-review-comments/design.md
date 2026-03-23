## Context

The translation workflow introduced in PR #18 spans service worker context-menu handling, content-script rendering, and styling. Copilot review surfaced five concrete quality gaps: close-button accessibility, missing promise rejection handling, type duplication risk, CSS/inline positioning conflict, and mismatched width assumptions during positioning.

## Goals / Non-Goals

**Goals:**

- Ensure translation card controls meet baseline accessibility expectations.
- Guarantee translation requests always resolve to a user-visible success/error message path.
- Centralize translation result/error typing usage in background message dispatch.
- Make translation card positioning deterministic across desktop and mobile layouts.
- Keep fixes narrowly scoped with minimal behavioral drift from existing translation UX.

**Non-Goals:**

- Redesigning translation card visuals or interaction model.
- Changing translation provider strategy, endpoint defaults, or storage schema.
- Refactoring unrelated TTS playback or context-menu systems.

## Decisions

- Add an explicit accessible name/title for the close control while keeping compact visual affordance.
  - Rationale: low-risk fix that improves screen reader support without changing layout.
  - Alternative considered: replacing text close with SVG icon button only; rejected to avoid additional assets and style churn.
- Add a terminal error path (`catch`) around provider translation promise execution and map unexpected failures to `UNKNOWN_ERROR`.
  - Rationale: prevents unhandled rejections and guarantees content script receives a failure state.
  - Alternative considered: wrapping full callback flow in try/catch; rejected because promise rejection still requires explicit async handling.
- Reuse shared translation result/error types from existing translation/message type sources in context-menu messaging helpers.
  - Rationale: single source of truth avoids drift when error codes or payload contracts evolve.
  - Alternative considered: keep local inline union for readability; rejected due to maintenance risk.
- Remove or de-prioritize CSS declarations that conflict with runtime placement (`right`/`bottom` with `!important`) and keep JS fallback placement when no anchor exists.
  - Rationale: runtime placement must remain authoritative when selection anchors are present.
  - Alternative considered: keep CSS fixed positioning and skip dynamic placement; rejected because near-selection placement is core UX.
- Compute horizontal clamping with measured container width rather than hard-coded constant.
  - Rationale: keeps placement aligned with actual rendered card size and responsive constraints.
  - Alternative considered: synchronize constants between CSS/TS; rejected because computed width remains more robust to future style changes.

## Risks / Trade-offs

- [Accessibility label wording mismatch with localization expectations] -> Use concise English label now and track localization separately.
- [Shared type import introduces coupling between modules] -> Import from existing shared type surface already used for messaging.
- [Positioning updates could affect mobile fallback] -> Keep existing mobile media-query behavior and validate fallback when no selection rect is available.
