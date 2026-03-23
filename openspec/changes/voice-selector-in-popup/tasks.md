## 1. HTML — Add voice selector to popup

- [ ] 1.1 Add a `<div class="voice-selector">` section with a `<label>` and `<select id="voice-select">` to `popup.html`, placed between the auth section and the Settings link

## 2. CSS — Style the voice dropdown

- [ ] 2.1 Add `.voice-selector` and `#voice-select` styles to `popup.css` consistent with the existing popup aesthetic (full-width, rounded corners, matching font/color tokens)

## 3. TypeScript — Voice logic in popup.ts

- [ ] 3.1 In `popup.ts` `DOMContentLoaded` handler, read `selectedVoice` from `chrome.storage.local` and call `populateVoices(selectedVoice)` on the popup's `#voice-select`
- [ ] 3.2 Add a `populateVoices(selectedVoice: string)` function in `popup.ts` that calls `chrome.tts.getVoices()`, builds the options list (with "Default Voice" first), and sets the selected value
- [ ] 3.3 Add a `change` event listener on `#voice-select` that calls `chrome.storage.local.set({ selectedVoice })` on selection change

## 4. Verification

- [ ] 4.1 Build the extension (`pnpm build`) and verify no TypeScript errors
- [ ] 4.2 Load the unpacked extension in Chrome and confirm the voice dropdown appears, is pre-populated, and saves correctly to `chrome.storage.local`
