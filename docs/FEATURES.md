# Talkient.Extension Features

## Authentication

- OAuth2 with Google

## PopUp

- Sign In with Google
- Settings button
- "Report an issue" button (Talkient.Extension)

## Options (settings)

- Auto play next item (default: enabled)
- Follow highlight (default: enabled)
- Play/Pause button position (default: Left)
- Minimum words (default: 3)
- Maximum nodes to porcess per page (default: 1000)
- Panel hide duretion (minutes) (default: 30)
- Voice (default: \*)
- Speaking Rate (default: 1.00x)
- Pitch (default: 1.0x)
- Highlight Style (default: 30)

## Content

- Control panel
  - Settings button
  - Talkient scripts (enable/disable)
  - Speed
- Context Menu
  - "Play text" for selected text
- TTS playback
  - Play/pause button
- Highlight
- Handle `beforeprint`
- "Listen with Talkient" button on PDF tabs (opens the PDF viewer)

## PDF Viewer

- Extension page (`pdf-viewer/pdf-viewer.html?file=<url>`) built on pdf.js
- Opened by the service worker (not web accessible), PDF bytes handed over
  from the PDF tab through `chrome.storage.local` (5 minutes, deleted on read)
- Text read in reading order, split into blocks (short first block)
- Pages rendered near the viewport only; reading blocks never change, so
  playback and highlights survive scrolling
- Sentence and word highlight over the page, follows the reading
- Click a sentence to read from it, Space to play/pause
- Password protected PDFs

## Service Worker

- Tab Manager
- Handle messages (like play/pause, etc)
