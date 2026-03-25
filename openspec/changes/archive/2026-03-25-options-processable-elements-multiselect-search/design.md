## Context

The extension already supports `processableElements` as a persisted array of HTML tag names and uses that list in content processing decisions. The current Options UI exposes only six tags via individual checkboxes, which works for a small fixed set but becomes difficult to navigate and maintain when the selectable set grows to cover most commonly relevant HTML elements.

This change keeps the existing storage contract and runtime update flow, but replaces the selection interface with a searchable multi-select dropdown so users can efficiently find and toggle many tags.

## Goals / Non-Goals

**Goals:**

- Expand predefined processable element options to a broad, curated list of common HTML elements used for textual content.
- Replace checkbox-based selection with a keyboard-accessible, searchable multi-select control.
- Preserve backward compatibility for stored settings and content script behavior.
- Keep persistence immediate and keep UI synchronized with external storage changes.

**Non-Goals:**

- Introducing arbitrary free-text custom tag entry.
- Changing how `shouldProcessNode()` interprets the selected list.
- Migrating storage shape away from `string[]`.

## Decisions

- Use a native `<select multiple>` enhanced with client-side search/filter behavior in the options page.
  - Rationale: avoids new external dependencies, keeps bundle size and CSP constraints simple, and remains maintainable in an MV3 extension.
  - Alternative considered: third-party select library (e.g., Select2/Tom Select). Rejected due to added dependency weight and extension packaging complexity for a relatively small UI need.

- Define a single source-of-truth ordered constant for selectable tags shared by defaults and options rendering.
  - Rationale: prevents drift between what can be selected, what is defaulted, and what tests assert.
  - Alternative considered: hardcoding UI list separately from defaults. Rejected because it risks inconsistency.

- Keep default selected tags backward-compatible while expanding available options.
  - Rationale: existing users should not see unexpected processing behavior changes after update.
  - Alternative considered: auto-selecting all newly available tags by default. Rejected because it may broaden processing scope unexpectedly.

- Implement search as case-insensitive substring matching over tag names, preserving full list order.
  - Rationale: predictable and easy-to-learn behavior with low implementation complexity.
  - Alternative considered: fuzzy ranking. Rejected as unnecessary complexity for short token-like labels.

## Risks / Trade-offs

- [Risk] Native multi-select discoverability is weaker than checkboxes for some users. -> Mitigation: provide clear label, helper text, selected-count feedback, and visible selected state.
- [Risk] Large tag list increases accidental selection risk. -> Mitigation: keep curated list focused on common content-bearing elements and provide fast search.
- [Risk] Divergence between filtered UI view and persisted selection state. -> Mitigation: maintain selection in canonical in-memory set and always serialize from that state on change.
- [Trade-off] No third-party rich select features (chips, async options). -> Benefit: simpler implementation and lower maintenance burden.

## Migration Plan

- Ship UI replacement and expanded option list in one release while keeping the same storage key/value shape.
- On load, normalize stored tags against allowed options; ignore unknown tags for UI display while preserving save behavior through normalized writes.
- Rollback path: restore checkbox renderer while reusing unchanged `processableElements` storage contract.

## Open Questions

- Should rarely useful but valid text-bearing elements such as `dt`/`dd` be included in the initial curated list or deferred?
- Do we want an explicit "Select common defaults" action in addition to manual multi-select edits?
