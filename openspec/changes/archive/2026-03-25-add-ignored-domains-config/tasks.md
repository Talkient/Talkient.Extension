## 1. Settings Model and Domain Matching

- [x] 1.1 Add `ignoredDomains` to extension settings defaults/schema with an empty array default.
- [x] 1.2 Implement domain normalization/validation utility for options input (trim, lowercase, host validation).
- [x] 1.3 Implement ignored-domain matching helper for exact hostname and subdomain suffix checks.

## 2. Options Page Ignored Domains UI

- [x] 2.1 Add an "Ignored Domains" section to options UI with list rendering and empty-state handling.
- [x] 2.2 Implement add flow to persist validated normalized entries to `chrome.storage.local`.
- [x] 2.3 Implement edit flow to update an existing entry with validation and persistence.
- [x] 2.4 Implement delete flow to remove an entry from storage and refresh UI state.
- [x] 2.5 Add validation feedback for empty/invalid entries and prevent invalid saves.

## 3. Runtime Processing Integration

- [x] 3.1 Load/copy ignored domains into content-script runtime state alongside existing settings.
- [x] 3.2 Update processing eligibility (`shouldProcessNode()` guard path) to return false for ignored hostnames before element checks.
- [x] 3.3 Extend `chrome.storage.onChanged` handling so ignored-domain updates apply in open tabs without reload.

## 4. Verification

- [x] 4.1 Add or update unit tests for ignored-domain normalization and hostname matching behavior.
- [x] 4.2 Add or update options-page tests covering add, edit, delete, and invalid-entry handling.
- [x] 4.3 Add or update runtime/content-script tests confirming ignored domains prevent processing and non-matching domains continue normally.
