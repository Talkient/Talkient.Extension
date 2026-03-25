## ADDED Requirements

### Requirement: Ignored domains setting defaults to empty list

The system SHALL define an `ignoredDomains` setting in extension storage defaults with value `[]`.

#### Scenario: Fresh install has no ignored domains

- **WHEN** extension settings are initialized for a new user
- **THEN** `ignoredDomains` is stored or resolved as an empty array

### Requirement: Options page manages ignored domains list

The Options page SHALL render an "Ignored Domains" section that allows the user to add, edit, and delete domain entries persisted in `chrome.storage.local`.

#### Scenario: User adds a domain

- **WHEN** the user enters `example.com` and confirms add
- **THEN** `ignoredDomains` is updated to include `example.com`

#### Scenario: User edits a domain

- **WHEN** the user edits an existing entry from `example.com` to `news.example.com` and saves
- **THEN** `ignoredDomains` is updated with `news.example.com` replacing the original entry

#### Scenario: User deletes a domain

- **WHEN** the user removes an existing domain entry
- **THEN** `ignoredDomains` is updated with that entry removed

### Requirement: Ignored domain entries are normalized and validated

The Options page SHALL normalize each domain entry before persisting by trimming whitespace and converting to lowercase, and SHALL reject empty or invalid domain values.

#### Scenario: Entry is normalized before save

- **WHEN** the user saves `  WWW.Example.COM  `
- **THEN** the stored value in `ignoredDomains` is `www.example.com`

#### Scenario: Invalid entry is rejected

- **WHEN** the user attempts to save an empty or invalid domain value
- **THEN** the value is not persisted and the UI shows validation feedback

### Requirement: Content script skips processing on ignored domains

The content script SHALL disable Talkient processing on pages where `window.location.hostname` exactly matches or is a subdomain of an entry in `ignoredDomains`.

#### Scenario: Exact domain match is ignored

- **WHEN** current hostname is `example.com` and `ignoredDomains` contains `example.com`
- **THEN** Talkient does not process text nodes or inject controls on that page

#### Scenario: Subdomain match is ignored

- **WHEN** current hostname is `www.example.com` and `ignoredDomains` contains `example.com`
- **THEN** Talkient does not process text nodes or inject controls on that page

#### Scenario: Non-matching domain is processed normally

- **WHEN** current hostname is `example.org` and `ignoredDomains` contains `example.com`
- **THEN** Talkient processing behavior follows normal eligibility rules

### Requirement: Runtime updates apply without page reload

Open options pages and content scripts SHALL react to `ignoredDomains` changes from `chrome.storage.onChanged` so UI and matching behavior update without reloading the extension.

#### Scenario: External settings update refreshes options UI

- **WHEN** `ignoredDomains` is changed from another extension context
- **THEN** the Options page list updates to reflect the new values

#### Scenario: External settings update refreshes processing behavior

- **WHEN** `ignoredDomains` changes while a tab remains open
- **THEN** subsequent processing eligibility checks in that tab use the new ignore list
