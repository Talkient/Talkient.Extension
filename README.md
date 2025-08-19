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

- [] Sometimes the extension stuck and the entire browser needs to be reopen
- [] Play raw text within <p> elements when there are others sub-elements within the p tag.
- [] Estimate time in minutes
- [] Button to apply Talkient in the current page even if this is not on manifest.json (is it possible?)
- [] Button to remove Talkient in the current page
- [] play/pause buttons at the left and showing up on hover
- [] Control panel including play/pause, rate, voice
- [] Ignore text elements within <code>
- [] Options page
  - [] Reset default settings
  - [] Min words to add play button
  - [] Skip tags
  - [] Max elements per page
  - [] Elements to ignore
  - [] Follow scroll
- [] Popup page
- [] Add support for `"file:///*"` like PDF
- [] E2E tests (could start by loading the extension, e.g to get error is adding a title within manifest.json)
- Github Actions
  - [] E2E tests
  - [] build

## E2E tests

- Verify if it's covering the play next item with a span within an ancore tag
- Verify the extension load with title within manifest
