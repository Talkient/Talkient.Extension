This is a Chrome extension (manifest V3) built in typescript to be a TTS (text-to-speech).

The config "followHighlight" should follow the text being played by scrolling the page to let the text being played stay in the center of the page. However this is not working as expected. The e2e test follow-highlight.spec.ts is corretly failing

Read the code carefully and think about before trying to fix it.

- To run the e2e tests use "pnpm run test:e2e"
- To run the build/publish use "pnpm run publish"

The output of "pnpm run test:e2e -- follow-highlight.spec.ts" is at playwright-report/index.html
