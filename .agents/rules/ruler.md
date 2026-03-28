

<!-- Source: AGENTS.md -->

# Talkient - Web Extension for TTS functionalities

Talkient is a Web Extension for TTS functionalities. This follow the [Extensions Manifest V3](mdc:https:/developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) standards.

This is a Web Extension built in Typescript and compiled to run in JavaScript.

### Project Rules

- MUST always use `pnpm` over `npm` or `yarn`;
- MUST always use import on typescript files (es2016);
- MUST avoid change code unless strictly necessary;

### Tests

Here are the rules for tests in this project:

1. Raw HTML and css are testes by jest.
2. Playwright for E2E (end-to-end) tests.

### Manifest V3

There are some important documentations about Manifest V3 for chrome extensions:

- [Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Manifest permissions](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [Manifest API Reference](https://developer.chrome.com/docs/extensions/reference/api)



<!-- Source: .ruler/AGENTS.md -->

# Talkient - Web Extension for TTS functionalities

Talkient is a Web Extension for TTS functionalities. This follow the [Extensions Manifest V3](mdc:https:/developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) standards.

This is a Web Extension built in Typescript and compiled to run in JavaScript.

### Project Rules

- MUST always use `pnpm` over `npm` or `yarn`;
- MUST always use import on typescript files (es2016);
- MUST avoid change code unless strictly necessary;

## Run commands

- You're using Git Bash.
- To run commands simply run the command like `pnpm build`. You don't have to use `cd` and/or complex commands

### Tests

Here are the rules for tests in this project:

1. Raw HTML and css are testes by jest.
2. Playwright for E2E (end-to-end) tests.

### Manifest V3

There are some important documentations about Manifest V3 for chrome extensions:

- [Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Manifest permissions](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- [Manifest API Reference](https://developer.chrome.com/docs/extensions/reference/api)



<!-- Source: .ruler/service-worker.md -->

# Service Worker in Chrome Extensions

Service workers are persistent background scripts that handle extension events when the extension isn't actively being used. They:

- Manage extension lifecycle events
- Handle browser events (tabs, navigation, messages)
- Coordinate between different extension components
- Run in the background independent of any UI
- Can use most Chrome extension APIs
- Replace the deprecated background pages in Manifest V3

Service workers are event-driven, stateless, and can be started/stopped by the browser as needed to conserve resources.

Official documentation: [Service Workers - Chrome Developers](https://developer.chrome.com/docs/extensions/mv3/service_workers/)



<!-- Source: .ruler/tests.md -->

# Test Instructions for Talkient Extension

## Constraints

- You MUST always run all tests after any change in the codebase.
- E2E tests can be intermitent. Run them twice if they fail the first time.

## Running Tests

1. Raw HTML and css are testes by jest. Run using `pnpm test`
2. Playwright for E2E (end-to-end) tests.Rung using `pnpm test:e2e`
