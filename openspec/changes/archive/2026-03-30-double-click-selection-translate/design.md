## Context

Talkient already supports selection-based translation through a context menu action handled in the service worker and surfaced in-page via content-script result UI. The requested change adds a faster interaction: when users select text with a double left click, an inline Talkient icon should appear near the selection and trigger the same translation pipeline on click. This crosses content interaction handling, ephemeral UI rendering, and translation orchestration boundaries while preserving existing behavior.

## Goals / Non-Goals

**Goals:**

- Add a reliable selection-triggered inline translate icon for double-left-click workflows.
- Reuse existing translation orchestration and feedback messages to avoid duplicate translation logic.
- Keep context menu translation fully functional and unchanged for existing users.
- Ensure deterministic cleanup so icon UI does not linger across selection/page state changes.

**Non-Goals:**

- Replacing or removing the context menu translation entry point.
- Redesigning translation result card visuals or translation provider selection logic.
- Introducing new translation providers, backend APIs, or persisted translation history.

## Decisions

### 1) Implement inline trigger fully in content script

- **Decision:** Add selection/double-click listeners and icon lifecycle management under `src/content/`.
- **Rationale:** Selection state and geometry are DOM-local concerns; content script can react instantly without extra round-trips.
- **Alternatives considered:**
  - **Service worker managed trigger:** Rejected because service workers cannot directly manage page DOM.
  - **Injected page script bridge:** Rejected due to extra complexity and weaker extension isolation.

### 2) Reuse existing translation pipeline entry point semantics

- **Decision:** Route icon clicks through the same translation request path currently used by context menu translation (same provider and message contract).
- **Rationale:** Preserves one source of truth for loading/result/error behavior and minimizes regression risk.
- **Alternatives considered:**
  - **Create separate icon-only translation flow:** Rejected because it duplicates provider and error mapping logic.

### 3) Use bounded trigger lifecycle rules

- **Decision:** Show icon only for non-empty user selection produced by double left click, anchor it near selected range, and remove it on selection collapse, outside interactions, scroll-induced invalid geometry, or successful trigger click.
- **Rationale:** Prevents stale overlays and keeps UX predictable.
- **Alternatives considered:**
  - **Persist icon until explicit close:** Rejected because it clutters pages and increases accidental clicks.

### 4) Add focused tests at unit + E2E layers

- **Decision:** Add/extend unit tests around trigger visibility/click orchestration and add E2E for the double-click-to-translate user path.
- **Rationale:** This change is interaction-heavy and susceptible to browser-event edge cases.
- **Alternatives considered:**
  - **Unit tests only:** Rejected because realistic selection and mouse behavior needs browser-level verification.

## Risks / Trade-offs

- [Selection event variability across sites] -> Mitigate by combining `dblclick` intent with `window.getSelection()` validation and range geometry guards.
- [Overlay conflicts with site UI/z-index] -> Mitigate with scoped class names, explicit z-index, and viewport clamping.
- [Duplicate requests from repeated clicks] -> Mitigate by disabling/removing trigger immediately on click until a new valid selection is made.
- [Behavior drift between context-menu and icon flows] -> Mitigate by reusing one translation orchestration function and shared message types.

## Migration Plan

- Deploy as additive behavior in content script and translation orchestration.
- No storage migration required.
- Rollback by removing inline trigger wiring while keeping existing context menu translation path untouched.

## Open Questions

- Should the inline trigger appear for keyboard-only selections (`Shift+Arrow`) or remain double-click-only in this change?
- Should long selections be truncated in the inline trigger request, or rely solely on provider-side handling?
