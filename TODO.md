# Talkient.Extension TO DO list

## MVP

- control panel within pages with no article/processable texts (config require article)
- PRD + techspec to add shadcn UI
- [Need more testing] Control panel appearing on any page - should be displayed only when there is article tag?
- Hooks (copilot, claude code and OpenCode)
  - Lint, tests
- Claude Code rules
- [ ] Authentication
  - [ ] Add OIDC (stashed changes) to enable JIT Registration flow
  - [ ] Authenticate with LP (could use the same auth?)
- [ ] Options page
  - [ ] Bug: Elements to process/ignore: scroll down, select an item automatically jumps to the top
- [ ] Bug: text elements within text elements should consider the father element
- [ ] E2E tests
  - Mock fixed HTML instead of navigating to external pages
  - Playwright + Playwright CLI
- No play button visible on empty state (only on text hover)
- Design System for (shadcn ui)
  - Control panel
  - Highlight + play/pause
  - Translation result (inline and right click)
  - Options page
  - Popup
- Organize the extension page (Chrome Web Store)
  - Screenshots
  - Descriptions

# V2

- [ ] Talkient scripts switch (control panel) is a global config instead of current page config
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
- White/dark mode
