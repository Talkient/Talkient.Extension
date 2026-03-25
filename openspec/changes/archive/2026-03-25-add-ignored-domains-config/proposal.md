## Why

Users currently cannot tell Talkient to stay disabled on specific websites, which creates friction on domains where text-to-speech controls are unwanted. Adding an ignored domains list gives users direct control over where the extension should not run.

## What Changes

- Add a new options configuration named `ignoredDomains` stored in extension settings, defaulting to an empty list.
- Add an options UI section that lets users add, edit, and delete ignored domain entries.
- Update content-script processing flow to skip Talkient behavior on pages whose hostname matches any configured ignored domain.
- Keep runtime behavior in sync so option changes are reflected in open tabs after settings updates.

## Capabilities

### New Capabilities

- `ignored-domains-config`: User-managed domain ignore list in settings and runtime domain-based opt-out behavior.

### Modified Capabilities

- `processable-elements-config`: Processing eligibility now also depends on ignored domain matching before processable element checks are applied.

## Impact

- Affected code: settings schema/defaults, options page components/state handling, content script processing guards, storage change listeners.
- APIs/systems: `chrome.storage.local`, `chrome.storage.onChanged`, content script hostname inspection.
- Dependencies: no external service dependency changes expected.
