# Talkient.Extenion

## Deploy new version

- Update the version within `manifest.json` and `package.json`
- Run `pnpm run publish`
- Create a zip file with the generated content from `./dist` and call it like `0.0.3.zip`
- Go to the [Talkient's page on Chrome Web store](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/package), upload the zip
- Make sure the [Privacy](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/privacy) and [Store listing](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/listing) setting are up to date
- Click Save draft and then submit.

## TO DO

- [] [Bug] When the play next item is enabled and the next item is a link, it goes to the link
- [] Sometimes the extension stuck and the entire browser needs to be reopen
- [] Add a console error when a new error is pushed within `chrome.runtime.lastError`
- [] Play <p> elements
- [] Estimate time in minutes
- [] Options page
- [] Popup page
- [] Unit tests
- [] E2E tests (could start by loading the extension, e.g to get error is adding a title within manifest.json)
- [] Github Actions for E2E tests
- [] Improve Analytics security

## E2E tests

- Verify if it's covering the play next item with a span within an ancore tag
- Verify the extension load with title within manifest
