## Context

The extension options page allows users to change runtime behavior through persisted settings, but it does not provide a fast recovery path when users want to undo many changes at once. Current recovery requires manually editing each field, which is error-prone and frustrating.

The change introduces a reset action in the existing options UI and uses the established settings persistence layer to write known defaults back to storage. This keeps behavior consistent with current save/load flows and avoids introducing a parallel settings path.

## Goals / Non-Goals

**Goals:**

- Provide a visible `Reset to default settings` action on the options page.
- Require explicit user confirmation before applying a destructive reset.
- Restore all supported settings to canonical defaults in a single operation.
- Ensure the UI immediately reflects reset values after completion.
- Add automated tests (unit and/or E2E) that cover confirm and cancel flows and storage outcomes.

**Non-Goals:**

- Changing the default values themselves.
- Adding per-setting or partial reset behavior.
- Adding sync/migration logic across extension versions beyond existing settings load behavior.

## Decisions

- **Use a dedicated reset action in options UI**: Add a clearly labeled button near settings actions so users can discover recovery behavior without navigating away.
  - Alternatives considered: burying reset in a menu (lower discoverability), or auto-reset on invalid state (too surprising).

- **Require a confirmation step before reset**: Use a browser-native confirmation dialog or equivalent existing modal pattern to prevent accidental data loss.
  - Alternatives considered: immediate reset with toast undo (higher accidental risk), two-click inline affordance without clear warning (less explicit).

- **Reuse existing settings defaults source**: Read defaults from the same constants/schema used for first-load initialization so reset and initial state stay aligned.
  - Alternatives considered: duplicated defaults in options page (drift risk), constructing defaults ad hoc from UI values (incomplete coverage risk).

- **Apply reset through existing persistence API**: Perform a standard write operation to extension storage and then refresh in-memory/form state from the resulting values.
  - Alternatives considered: direct DOM-level field resets without storage update (state mismatch risk), clearing storage keys and relying on lazy fallback (timing ambiguity).

- **Test reset behavior at multiple levels**: Add unit tests for reset handler logic and at least one end-to-end validation of user-visible behavior when practical.
  - Alternatives considered: unit-only (misses integration issues), E2E-only (slower feedback and harder edge-case validation).

## Risks / Trade-offs

- **Accidental reset by user** -> Mitigation: enforce confirmation and provide clear destructive wording on the action.
- **Defaults drift from actual expected values** -> Mitigation: source defaults from one canonical module and cover key defaults in tests.
- **Asynchronous storage write race conditions** -> Mitigation: await storage completion before marking reset complete and updating UI state.
- **Test fragility in E2E confirmation flows** -> Mitigation: use stable selectors and deterministic dialog handling in tests.
