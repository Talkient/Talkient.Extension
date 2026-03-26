## Why

Users can change multiple options and currently have no quick way to recover from a misconfiguration. Adding a one-click reset to defaults improves usability, reduces support friction, and gives users a safe fallback when settings produce unexpected behavior.

## What Changes

- Add a `Reset to default settings` action in the options page UI.
- Show a confirmation step before applying the reset to avoid accidental data loss.
- Restore all extension options to their documented default values in one operation.
- Persist reset values through the same storage path used by normal settings updates.
- Add automated test coverage for reset behavior (unit and/or E2E), including confirmation and persistence outcomes.

## Capabilities

### New Capabilities

- `options-settings-reset`: Provide a reset control in options that confirms intent and restores all supported settings to defaults.

### Modified Capabilities

None.

## Impact

- Affected code: options page UI, options state management, storage/default settings utilities, and related test suites.
- APIs/systems: browser extension storage APIs used for options persistence.
- Dependencies: no new runtime dependencies expected; test updates may extend existing Jest and Playwright coverage.
