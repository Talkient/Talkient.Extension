---
applyTo: 'src/background/**/*.ts'
---

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
