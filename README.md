# Talkient.Extenion

- Create a System Design or similar (maybe as a isolated github repository)

## Features

- Text-to-speech conversion for web page content
- Right-click context menu to play selected text
- Customizable speech settings (rate, pitch, voice)
- Visual highlighting of text being read
- Multiple highlighting styles
- Auto-play next text section
- Configurable minimum word count for processing
- Configurable maximum nodes processed limit for performance optimization
- Control panel for easy access to common settings

## Deploy new version

- Update the version within `manifest.json` and `package.json`
- Run `pnpm run publish`
- Create a zip file with the generated content from `./dist` and call it like `0.0.3.zip`
- Go to the [Talkient's page on Chrome Web store](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/package), upload the zip
- Make sure the [Privacy](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/privacy) and [Store listing](https://chrome.google.com/webstore/devconsole/20fe41e7-86af-425d-80aa-e36e07861587/mabpfeobaegdlchpnipdfaahmhdaabdc/edit/listing) setting are up to date
- Click Save draft and then submit.
- Create a new tag/release on GH.

## TO DO

[Talkient.Extension TO DO list](./TODO.md)
