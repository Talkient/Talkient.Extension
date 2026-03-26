## 1. Fix `removeTalkientUiElements` to fully unwrap DOM

- [ ] 1.1 In `src/content/content.ts`, update `removeTalkientUiElements()` to unwrap each `.talkient-processed` span: move its child text node(s) back to the parent and remove the wrapper span, instead of only removing the class
- [ ] 1.2 Verify the control panel and play buttons are still removed before unwrapping (order: remove panel → remove buttons → unwrap spans)

## 2. Strengthen guard in `shouldProcessNode()`

- [ ] 2.1 In `src/features/tts-playback/content/text-processor.ts`, replace the single `parent.classList.contains('talkient-processed')` check with an ancestor walk that returns `false` if any ancestor at any depth has the class `talkient-processed`
- [ ] 2.2 Place the ancestor walk check as an early return near the top of `shouldProcessNode()`, before the processable-elements walk

## 3. Unit tests

- [ ] 3.1 Add a Jest test for `shouldProcessNode()`: a text node nested inside an element with class `talkient-processed` (even if the immediate parent does not have the class) must return `false`
- [ ] 3.2 Add a Jest test for the re-processing scenario: call `processTextElements()` twice on the same DOM fixture (simulating a settings change); assert each qualifying text node has exactly one `.talkient-play-button`
- [ ] 3.3 Add a Jest test for `removeTalkientUiElements()`: after calling `processTextElements()` then `removeTalkientUiElements()`, assert no `.talkient-processed` elements remain in the DOM

## 4. Verify

- [ ] 4.1 Run `pnpm test` and confirm all unit tests pass
- [ ] 4.2 Load the extension in Chrome, navigate to a page that previously showed duplicate buttons, and confirm each paragraph has exactly one play button after initial load and after a settings change
