# Talkient.Extenion

## Deploy new version

- Update the version within `manifest.json` and `package.json`
- Run `pnpm run publish`
- Create a zip file with the generated content from `./dist` and call it like `0.0.3.zip`
- Go to the [Talkient's page on Chrome Web store](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/package), upload the zip
- Make sure the [Privacy](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/privacy) and [Store listing](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/listing) setting are up to date
- Click Save draft and then submit.
- Create a new tag/release on GH.

## TO DO

- [ ] play/pause buttons at the left and showing up on hover
- [ ] Bug sometimes the first play stuck in playing state but we got the console error on service-worker (for large paragraphs): Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
- [ ] Skip hidden elements
- [ ] play button for a tags
- [ ] Bug: If you are playing one text and click to play another one, the first is kept in "playing" state
- [ ] Sometimes the extension stuck and the entire browser needs to be reopen
- [ ] Estimate time in minutes
- [ ] Highlight chunks
- [ ] Button to apply Talkient in the current page even if this is not on manifest.json (is it possible?)
- [ ] Control panel including play/pause, rate, voice
- [ ] Restart the current audio
- [ ] Options page
  - [ ] Reset default settings
  - [ ] Skip tags
  - [ ] Elements to ignore
  - [ ] Follow scroll
- [ ] Popup page
- [ ] Add support for `"file:///*"` like PDF
- [ ] E2E tests
  - Play/Pause
  - Verify if it's covering the play next item with a span within an ancore tag
  - Verify the extension load with title within manifest
  - Mock fixed HTML instead of navigating to external pages
  - Make sure everything done via control panel reflect on options page and vice-versa
  - Complex flows: play/pause directly and via control panel, alternatively
- Github Actions
  - [ ] E2E tests
  - [ ] Submit a new version on Chrome Web Store
