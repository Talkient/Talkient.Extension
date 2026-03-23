# Talkient.Extension

- Create a System Design or similar (maybe as a isolated github repository)

## Features

- Text-to-speech conversion for web page content
- Right-click context menu to play selected text
- Right-click context menu to translate selected text
- Customizable speech settings (rate, pitch, voice)
- Visual highlighting of text being read
- Multiple highlighting styles
- Auto-play next text section
- Configurable minimum word count for processing
- Configurable maximum nodes processed limit for performance optimization
- Control panel for easy access to common settings

## Translation Configuration Assumptions

- Primary provider endpoint defaults to `https://translate.argosopentech.com/translate`
- Automatic fallback endpoint uses `https://translate.googleapis.com/translate_a/single`
- Target language defaults to `en` when no language preference is stored
- Source language defaults to `auto` when no language preference is stored
- Output language can be changed in Options (`Translation output language`)
- Manifest includes host permissions for both translation endpoints

## Deploy new version

- Update the version within `manifest.json` and `package.json`
- Run `pnpm run publish`
- Create a zip file with the generated content from `./dist` and call it like `0.0.3.zip`
- Go to the Chrome Web Store Developer Dashboard, navigate to your extension, and upload the zip
- Make sure the Privacy and Store listing settings are up to date
- Click Save draft and then submit
- Create a new tag/release on GitHub

## TO DO

[Talkient.Extension TO DO list](./TODO.md)
