# Talkient: Chrome DevTools MCP Navigation

Use this skill when debugging or testing the Talkient extension in the browser.

## Key patterns

### List / switch pages

```
mcp__chrome-devtools__list_pages        → see all open tabs + IDs
mcp__chrome-devtools__select_page       → switch active tab by pageId
```

### Navigate

```
navigate_page type=url  url=<url>       → go to any URL (incl. chrome-extension://)
navigate_page type=reload               → reload current page
navigate_page type=back                 → go back
```

### Access extension pages (extension ID: nbecmfmoajeiiofdgokdlmamhcdmpjnf)

- Options page: `chrome-extension://nbecmfmoajeiiofdgokdlmamhcdmpjnf/options/options.html`
  - Has full chrome.\* API access — use evaluate_script here to call chrome.tts, chrome.storage, etc.
- Extensions manager: `chrome://extensions`
  - Click uid of the **Reload** button to reload the extension SW after a build

### Reload the extension after build

1. Navigate to `chrome://extensions`
2. `take_snapshot` to get UIDs
3. Click the Reload button uid (labelled `"Reload" description="Related to Talkient"`)
4. Navigate back to the test page

### Run JS in page vs extension context

- `evaluate_script` runs in the **page** main world — no `chrome.*` API
- Navigate to the options page first, then `evaluate_script` to access `chrome.tts`, `chrome.storage`, etc.
- Content script DOM changes (class adds, span inserts) ARE visible from page evaluate_script
