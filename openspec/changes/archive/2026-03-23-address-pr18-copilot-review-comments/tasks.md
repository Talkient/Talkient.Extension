## 1. Accessibility and UI behavior fixes

- [x] 1.1 Update translation close button markup in `src/content/translation-result.ts` to include an accessible label/title while preserving the compact UI.
- [x] 1.2 Remove CSS priority conflicts in `src/content/content.css` so runtime placement can switch between near-selection and fallback bottom-right positions.
- [x] 1.3 Replace hard-coded translation card width clamping logic with measured container width in `src/content/translation-result.ts`.

## 2. Background translation reliability and typing

- [x] 2.1 Add a terminal error handler for translation provider promise rejections in `src/features/tts-playback/background/context-menu.ts` that emits `TRANSLATION_ERROR` with `UNKNOWN_ERROR`.
- [x] 2.2 Refactor translation dispatch helper typing in `src/features/tts-playback/background/context-menu.ts` to reuse shared translation result and error-code types.
- [x] 2.3 Ensure error-message payloads remain non-empty and user-friendly for unexpected failures.

## 3. Validation and regression coverage

- [x] 3.1 Add or update unit tests for close-button accessibility attributes and translation card positioning behavior.
- [x] 3.2 Add or update unit tests for unexpected translation provider rejection handling and message dispatch contract typing behavior.
- [x] 3.3 Run project test suites relevant to translation/content/background flows and resolve any regressions.
