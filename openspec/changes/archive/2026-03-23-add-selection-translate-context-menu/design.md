## Context

Talkient currently provides text-to-speech workflows but does not provide a translation workflow from page selection. The extension already has MV3 service-worker and messaging patterns that can be extended for context-menu commands. This change adds a new selected-text action similar to common translation extensions while keeping provider logic isolated and testable.

## Goals / Non-Goals

**Goals:**

- Add a right-click action for selected text that triggers translation from the extension runtime.
- Route translation through a provider adapter so provider switching does not affect command orchestration.
- Present clear success and error feedback for users after invoking translate.
- Include unit and E2E coverage for the full selection-to-result flow.

**Non-Goals:**

- Build a full standalone translation webpage with history management.
- Add voice playback of translated content in this change.
- Support offline translation engines.

## Decisions

### Use service worker as command orchestrator

- Decision: Register and handle `chrome.contextMenus` events in the MV3 service worker.
- Rationale: Context menu APIs are natively background-driven in MV3; this keeps privileged API calls centralized.
- Alternative considered: Handling menu actions in content scripts. Rejected because content scripts cannot own context-menu lifecycle as cleanly.

### Introduce translation provider adapter interface

- Decision: Add a provider abstraction (`translate(text, sourceLang?, targetLang?)`) used by the command handler.
- Rationale: Decouples extension flow from a single external API and simplifies unit mocking.
- Alternative considered: Direct API calls in event handler. Rejected due to tight coupling and harder tests.

### Return result via extension messaging and lightweight UI renderer

- Decision: Service worker sends translation results/errors to the active tab through existing messaging channels; content-side UI renders a compact result card.
- Rationale: Keeps UI responsive and localized to user context without forcing popup focus.
- Alternative considered: Show result only in extension popup. Rejected because it adds navigation friction after right-click action.

### Validate behavior with layered testing

- Decision: Add Jest tests for menu handler, provider adapter error mapping, and message payload shaping; add Playwright flow for right-click selected text and displayed translation.
- Rationale: Unit tests protect command logic, while E2E verifies browser-level interaction and UI feedback.

## Risks / Trade-offs

- [Translation API latency or failure] -> Mitigation: add timeout handling, user-visible error state, and retry guidance.
- [Permission/host scope growth] -> Mitigation: request minimum required permissions and isolate host permissions to provider domains.
- [UI injection conflicts with host page styles] -> Mitigation: namespace CSS classes and render in a contained root element.
- [Flaky context-menu E2E interactions] -> Mitigation: use deterministic fixture pages and robust Playwright selectors/waits.

## Migration Plan

1. Add/adjust manifest permissions and context menu registration logic behind a feature flag defaulted on for development.
2. Integrate provider adapter and messaging endpoints.
3. Add UI result card rendering and error states.
4. Land unit tests, then E2E test with stable fixtures.
5. Rollback strategy: disable context menu registration and hide translation UI path while retaining non-translation features.

## Open Questions

- Which translation provider and quota strategy should be default for production usage?
- Should target language come from extension settings, browser locale, or per-invocation prompt?
- Should translated text offer one-click replace/copy actions in initial release?
