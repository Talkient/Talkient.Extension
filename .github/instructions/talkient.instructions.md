---
applyTo: '**'
---

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
