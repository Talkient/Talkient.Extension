## Why

The current "Processable Elements" configuration is limited to six tags and uses individual checkboxes, which does not scale as users need broader HTML coverage. A searchable multi-select control will make it practical to include many common elements while keeping the options page usable.

## What Changes

- Expand the supported predefined HTML tag options for "Processable Elements" from a small fixed list to a broader set of common content-bearing elements.
- Replace the current checkbox list UI in the Options page with a searchable multi-select dropdown that supports selecting and deselecting multiple tags.
- Preserve current storage behavior (`processableElements` as an array of tag names), defaults compatibility, and runtime updates so existing users are not broken.
- Update options page behavior requirements to cover search, selection display, persistence, and external storage synchronization for the new control.

## Capabilities

### New Capabilities

- `processable-elements-options-searchable-select`: Searchable multi-select UX for managing processable HTML elements in the options page.

### Modified Capabilities

- `processable-elements-config`: Expand predefined element coverage and change options-page requirements from checkbox-based interaction to searchable multi-select interaction while retaining storage/runtime semantics.

## Impact

- Affected code: options page UI rendering and interaction logic, settings defaults/constants for allowed tags, and related tests.
- APIs/storage: no schema shape change (still string array), but expanded allowed values and updated UI interaction model.
- Systems: browser extension options experience and content-script behavior validation for a wider element set.
