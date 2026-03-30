# Talkient.Extension TO DO list

## MVP

- Hooks (copilot, claude code and OpenCode)
  - Lint, tests
- Claude Code rules
- [ ] Authentication
  - [ ] Add OIDC (stashed changes) to enable JIT Registration flow
  - [ ] Authenticate with LP (could use the same auth?)
- [ ] Try to Integrate with DevTools MCP + skill to navigate easily with the extension (options page, etc)
- [ ] Sometimes the extension stuck and the entire browser needs to be reopen
- [ ] Options page
  - [ ] Bug: Elements to process/ignore: scroll down, select an item automatically jumps to the top
- [ ] Bug: text elements within text elements should consider the father element
- [ ] Bug: Talkient scripts switch (control panel) is a global config instead of current page config
- [ ] Bug sometimes the first play stuck in playing state but we got the console error on service-worker (for large paragraphs): Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
- [ ] E2E tests
  - Play/Pause
  - Ask LLMs to find test-gaps
  - Verify if it's covering the play next item with a span within an ancore tag
  - Verify the extension load with title within manifest
  - Mock fixed HTML instead of navigating to external pages
  - Make sure everything done via control panel reflect on options page and vice-versa
  - Complex flows: play/pause directly and via control panel, alternatively
  - Edge cases
  - Playwright + Playwright CLI
- Design System for Control panel, translation result and play button
- Translation: Double left-click
- Organize the extension page (Chrome Web Store)
  - Screenshots
  - Descriptions

# V2

- [ ] Summary by AI
- [ ] Getting started tour
- [ ] Restart the current audio
- [ ] Create side_panel (manifest.json)
- [ ] Talkient enable/disable (localStorage `playButtonsEnabled` already being used for reload scripts)
- [ ] Add support for `"file:///*"` like PDF
- [ ] Add content script for "run_at=document_idle"
- Keyboard Shortcuts
- Github Actions
  - [ ] Release: The assets should appear on the release page
  - [ ] Submit a new version on Chrome Web Store
- [ ] Design system + skill with [Paper MCP](https://paper.design/docs/mcp)
- Design System for options and popup
- White/dark mode
