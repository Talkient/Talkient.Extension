---
name: service-worker-manifest-v3
description: Service Worker in Chrome Extensions (Manifest V3)
compatibility: opencode
---

# Service Worker in Chrome Extensions (Manifest V3)

Service workers are event-driven background scripts that handle extension events. They replace background pages from Manifest V2.

## Key Characteristics

- **Event-driven**: Only run in response to events, not continuously
- **Stateless**: Cannot persist state in global variables (terminated when idle)
- **No DOM access**: Cannot use `window`, `document`, or DOM APIs
- **Lifecycle managed by browser**: Started/stopped automatically to conserve resources

## Manifest Declaration

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
}
```

## Lifecycle Events

```typescript
// Fired when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install
  } else if (details.reason === 'update') {
    // Extension updated
  }
});

// Fired when browser starts (if extension was enabled)
chrome.runtime.onStartup.addListener(() => {
  // Browser startup logic
});
```

## Common Event Listeners

```typescript
// Message passing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from content scripts or popup
  return true; // Keep channel open for async response
});

// Tab events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {});
chrome.tabs.onActivated.addListener((activeInfo) => {});

// Context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {});

// Alarms (for periodic tasks)
chrome.alarms.onAlarm.addListener((alarm) => {});
```

## State Persistence

Since service workers are stateless, use these APIs to persist data:

```typescript
// chrome.storage (recommended)
await chrome.storage.local.set({ key: 'value' });
const result = await chrome.storage.local.get('key');

// chrome.storage.session (cleared when browser closes)
await chrome.storage.session.set({ tempKey: 'tempValue' });
```

## Important Limitations

1. **No persistent connections**: WebSocket connections close when worker terminates
2. **30-second timeout**: Worker terminates ~30s after last event (use `chrome.alarms` for periodic tasks)
3. **No XMLHttpRequest**: Use `fetch()` API instead
4. **No localStorage/sessionStorage**: Use `chrome.storage` API

## Keeping Service Worker Alive (When Needed)

```typescript
// Use alarms for periodic tasks (minimum 1 minute interval)
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });

// For longer operations, use chrome.runtime.getBackgroundPage() alternatives
// or break work into smaller chunks
```

## Debugging

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Service worker" link under your extension to open DevTools
4. Check "Preserve log" to keep logs across restarts

## Best Practices

- Register all event listeners at the top level (synchronously)
- Never register listeners inside async callbacks
- Use `chrome.storage` instead of global variables
- Handle extension updates gracefully with `onInstalled`
- Use `chrome.alarms` instead of `setTimeout`/`setInterval`

## Official Documentation

- [Service Workers Overview](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Service Worker Events](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events)
- [Migrate to Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
