## 1. Options Reset UX

- [ ] 1.1 Add a `Reset to default settings` action to the options page using existing UI patterns and stable test selectors.
- [ ] 1.2 Implement a required confirmation step before applying reset, with clear destructive wording.

## 2. Reset-to-Default Behavior

- [ ] 2.1 Reuse the canonical default settings source and expose/reset through the existing options state management flow.
- [ ] 2.2 Persist full default settings to extension storage on confirmed reset and refresh the options UI with saved values.
- [ ] 2.3 Ensure canceled reset exits with no storage writes and no UI value changes.

## 3. Automated Test Coverage

- [ ] 3.1 Add unit tests for reset handler logic covering confirmed reset writes and canceled reset no-op behavior.
- [ ] 3.2 Add or update E2E coverage for the options reset flow, including confirmation requirement and post-reset default values.
- [ ] 3.3 Run relevant unit and E2E tests for options behavior and fix any regressions introduced by the change.
