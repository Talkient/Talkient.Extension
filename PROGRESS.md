# Slice Architecture Migration Progress

## Overview

Migrating Talkient Extension to Feature-based Slice Architecture to improve maintainability, reduce coupling, and eliminate circular dependencies.

**Start Date**: 2026-02-15  
**Strategy**: Incremental migration, one phase at a time  
**Commit Strategy**: One commit per phase  
**Testing Strategy**: Unit tests after each phase, E2E tests at the end

---

## Phase Status

### ✅ Phase 0: Planning (COMPLETED)

- [x] Analyze current codebase structure
- [x] Identify features and pain points
- [x] Design target Slice Architecture
- [x] Create 11-phase migration plan
- [x] Get user approval

### ✅ Phase 1: Setup Shared Infrastructure (COMPLETED)

**Goal**: Create foundation for all slices with shared Chrome API wrappers and types

**Tasks**:

- [x] Create `src/shared/` folder structure
- [x] Create `src/shared/api/storage.ts` - Chrome storage wrapper with caching
- [x] Create `src/shared/api/messaging.ts` - Safe message sending (from runtime-utils.ts)
- [x] Create `src/shared/api/tts.ts` - TTS API wrapper
- [x] Create `src/shared/api/tabs.ts` - Tabs API wrapper
- [x] Move `src/types/messages.ts` → `src/shared/types/messages.ts`
- [x] Create `src/shared/types/storage.ts` - Settings schema types
- [x] Create `src/shared/types/common.ts` - Common utility types
- [x] Update all import paths referencing `../types/messages`
- [x] Run `pnpm build` to check TypeScript errors
- [x] Run `pnpm test` to verify unit tests pass (22 suites, 362 tests passed)
- [x] Commit: "Phase 1: Setup shared infrastructure"

**Files Created**:

- `src/shared/api/storage.ts` - Type-safe chrome.storage wrapper with caching
- `src/shared/api/messaging.ts` - Safe message sending utilities
- `src/shared/api/tts.ts` - Chrome TTS API wrapper
- `src/shared/api/tabs.ts` - Chrome tabs API wrapper
- `src/shared/types/storage.ts` - StorageSchema interface and DEFAULT_SETTINGS
- `src/shared/types/common.ts` - Common utility types

**Files Moved**:

- `src/types/messages.ts` → `src/shared/types/messages.ts`

**Files Modified** (import path updates):

- `src/background/service-worker.ts`
- `src/content/content.ts`
- `src/content/runtime-utils.ts`
- `src/content/control-panel.ts`
- `src/popup/popup.ts`
- `src/shared/types/messages.ts`
- `src/content/__tests__/runtime-utils.test.ts`

**Directories Removed**:

- `src/types/` (empty after moving messages.ts)

**Files Modified**:

- Import path updates (not listed individually)

---

### ✅ Phase 2: Extract Assets Feature (COMPLETED)

**Goal**: Extract icons.ts to features/assets/ - smallest, zero-dependency slice

**Tasks**:

- [x] Create `src/features/assets/content/` structure
- [x] Move `src/content/icons.ts` → `src/features/assets/content/icons.ts`
- [x] Keep caching logic inline (decision: no separate icon-cache.ts needed)
- [x] Create `src/features/assets/types.ts` with IconName type
- [x] Create `src/features/assets/__tests__/icons.test.ts` with dedicated tests
- [x] Update imports in all files using icons.ts (7 files)
- [x] Run `pnpm build` (successful)
- [x] Run `pnpm test` (23 suites, 371 tests passed)
- [x] Commit: "Phase 2: Extract assets feature"

**Files Created**:

- `src/features/assets/types.ts` - IconName type definition
- `src/features/assets/content/icons.ts` - SVG icon utilities (moved from src/content/)
- `src/features/assets/__tests__/icons.test.ts` - Dedicated icon tests (9 tests)

**Files Moved**:

- `src/content/icons.ts` → `src/features/assets/content/icons.ts`

**Files Modified** (import path updates):

- `src/content/content.ts`
- `src/content/content-lib.ts`
- `src/content/control-panel.ts`
- `src/content/__tests__/content.test.ts`
- `src/content/__tests__/content-integration.test.ts`
- `src/content/__tests__/integration.test.ts`
- `src/content/__tests__/auto-play.test.ts`

**Files Deleted**:

- `src/content/icons.ts` (moved to features/assets/)

**Test Results**:

- 23 test suites passed (was 22 in Phase 1)
- 371 tests passed (was 362 in Phase 1)
- New test suite: `src/features/assets/__tests__/icons.test.ts` with 9 tests

---

### ⏳ Phase 3: Extract Highlighting Feature (PENDING)

**Goal**: Extract highlight.ts to features/highlighting/ - self-contained, no circular deps

**Tasks**:

- [ ] Create `src/features/highlighting/content/` structure
- [ ] Move `src/content/highlight.ts` → `src/features/highlighting/content/highlighter.ts`
- [ ] Extract styles to `src/features/highlighting/content/styles.ts`
- [ ] Extract scroll logic to `src/features/highlighting/content/scroll.ts`
- [ ] Create `src/features/highlighting/types.ts`
- [ ] Move tests to `src/features/highlighting/__tests__/`
- [ ] Update imports in content-lib.ts, control-panel.ts, content.ts
- [ ] Remove re-exports from content-lib.ts
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 3: Extract highlighting feature"

---

### ✅ Phase 4: Extract Settings Feature (COMPLETED)

**Goal**: Centralize all settings management in features/settings/

**Tasks**:

- [x] Create `src/features/settings/options/` structure
- [x] Move `src/options/options.ts` → `src/features/settings/options/options-ui.ts`
- [x] Move `src/options/*.html` → `src/features/settings/options/`
- [x] Move `src/options/*.css` → `src/features/settings/options/`
- [x] Create `src/features/settings/storage-schema.ts` with DEFAULT_SETTINGS
- [x] Create `src/features/settings/background/settings-sync.ts`
- [x] Create `src/features/settings/types.ts`
- [x] Move tests to `src/features/settings/__tests__/`
- [x] Update imports across codebase
- [x] Update `package.json` build scripts (build:options entry point)
- [x] Run `pnpm build`
- [x] Run `pnpm test`
- [x] Commit: "Phase 4: Extract settings feature"

**Files Created**:

- `src/features/settings/storage-schema.ts` - StorageSchema interface and DEFAULT_SETTINGS (moved from shared/types/storage.ts)
- `src/features/settings/types.ts` - Re-exports HighlightStyle, ButtonPosition, StorageSchema, DEFAULT_SETTINGS
- `src/features/settings/background/settings-sync.ts` - Background settings initialization utility
- `src/features/settings/options/options-ui.ts` - Options page UI logic (moved from src/options/options.ts)
- `src/features/settings/options/options.html` - Options page HTML (moved from src/options/)
- `src/features/settings/options/options.css` - Options page styles (moved from src/options/)

**Files Moved** (tests):

- `src/options/__tests__/` → `src/features/settings/__tests__/` (all 3 test files + chrome mock)

**Files Deleted**:

- `src/options/` (all files moved to features/settings/options/)
- `src/shared/types/storage.ts` (moved to features/settings/storage-schema.ts)

**Files Modified** (import/build updates):

- `src/shared/api/storage.ts` - imports from `../../features/settings/storage-schema`
- `package.json` - build:options, update-htmls, update-css scripts

**Test Results**:

- 23 test suites passed
- 371 tests passed

---

### ✅ Phase 5: Extract Auth Feature (COMPLETED)

**Goal**: Reorganize existing auth/ into features/auth/ with background/popup split

**Tasks**:

- [x] Create `src/features/auth/` structure
- [x] Move `src/auth/auth-types.ts` → `src/features/auth/types.ts`
- [x] Move `src/auth/auth-storage.ts` → `src/features/auth/background/auth-storage.ts`
- [x] Move `src/auth/auth-service.ts` → `src/features/auth/background/auth-service.ts`
- [x] Create `src/features/auth/background/message-handler.ts` (extract from service-worker.ts)
- [x] Create `src/features/auth/popup/auth-ui.ts` (extract from popup.ts)
- [x] Delete `src/auth/index.ts` (remove barrel exports)
- [x] Move tests to `src/features/auth/__tests__/`
- [x] Update imports in service-worker.ts, popup.ts
- [x] Run `pnpm build`
- [x] Run `pnpm test`
- [x] Commit: "Phase 5: Extract auth feature"

**Files Created**:

- `src/features/auth/types.ts` - Auth types (GoogleUser, AuthState, AuthResult, etc.)
- `src/features/auth/background/auth-storage.ts` - Chrome storage auth state management
- `src/features/auth/background/auth-service.ts` - Google OAuth sign-in/sign-out service
- `src/features/auth/background/message-handler.ts` - Auth message handler helpers (handleSignIn, handleSignOut, handleGetAuthState)
- `src/features/auth/popup/auth-ui.ts` - Auth UI logic extracted from popup.ts (initAuth)

**Files Moved** (tests):

- `src/auth/__tests__/auth-storage.test.ts` → `src/features/auth/__tests__/auth-storage.test.ts`
- `src/auth/__tests__/auth-service.test.ts` → `src/features/auth/__tests__/auth-service.test.ts`

**Files Deleted**:

- `src/auth/` (all files moved to features/auth/)

**Files Modified** (import/path updates):

- `src/shared/types/messages.ts` - GoogleUser import from `../../features/auth/types`
- `src/background/service-worker.ts` - auth import replaced with message-handler helpers
- `src/popup/popup.ts` - extracted auth logic, now imports `initAuth` from auth-ui

**Test Results**:

- 23 test suites passed
- 371 tests passed

---

### ✅ Phase 6: Split Service Worker (COMPLETED)

**Goal**: Break down monolithic service-worker.ts into feature handlers

**Tasks**:

- [x] Create `src/background/tab-manager.ts`
- [x] Create `src/features/tts-playback/background/tts-engine.ts` (extract TTS logic)
- [x] Create `src/features/tts-playback/background/context-menu.ts` (extract context menu)
- [x] Create `src/features/tts-playback/background/message-handler.ts` (extract TTS messages)
- [x] Slim down `src/background/service-worker.ts` to orchestrator
- [x] Tests remain in `src/background/__tests__/` (integration tests for the orchestrator)
- [x] Run `pnpm build`
- [x] Run `pnpm test`
- [ ] Commit: "Phase 6: Split service worker by responsibility"

**Files Created**:

- `src/features/tts-playback/background/tts-engine.ts` - TTS state management (`isPaused`, `currentText`, `availableVoices`, `ttsAvailable`) and `checkTtsAvailability()`
- `src/features/tts-playback/background/message-handler.ts` - `handleSpeakText` and `handlePauseSpeech` handlers
- `src/features/tts-playback/background/context-menu.ts` - `setupContextMenu` and `setupContextMenuClickHandler`
- `src/background/tab-manager.ts` - `activeTabId` state and `setupTabListeners` (onActivated, onRemoved, onUpdated)

**Files Modified**:

- `src/background/service-worker.ts` - Slimmed to orchestrator: imports handlers and calls setup functions

**Test Results**:

- 23 test suites passed
- 371 tests passed

---

### ✅ Phase 7: Extract Control Panel Feature (COMPLETED)

**Goal**: Move control-panel.ts to features/control-panel/, eliminate dynamic imports

**Tasks**:

- [x] Create `src/features/control-panel/content/` structure
- [x] Split `src/content/control-panel.ts` into:
  - [x] `panel-ui.ts` (UI creation)
  - [x] `panel-controller.ts` (event handlers, state)
  - [x] `panel-visibility.ts` (cookie logic)
- [x] Create `src/features/control-panel/types.ts`
- [x] Remove dynamic imports, use direct imports
- [x] Move tests to `src/features/control-panel/__tests__/`
- [x] Update imports from content-lib.ts, content.ts
- [x] Remove re-exports from content-lib.ts
- [x] Run `pnpm build`
- [x] Run `pnpm test`
- [ ] Commit: "Phase 7: Extract control panel feature"

**Files Created**:

- `src/features/control-panel/content/panel-visibility.ts` - Cookie-based panel hiding and hide duration settings
- `src/features/control-panel/content/panel-controller.ts` - Event handlers (close, toggle, settings, script controls, speech rate, drag); direct imports replacing dynamic imports
- `src/features/control-panel/content/panel-ui.ts` - Panel DOM creation, `createControlPanel`, `removeControlPanel`, `isControlPanelVisible`, `toggleControlPanel`
- `src/features/control-panel/types.ts` - `PanelState` type

**Files Moved** (tests):

- `src/content/__tests__/control-panel.test.ts` → `src/features/control-panel/__tests__/control-panel.test.ts`
- `src/content/__tests__/script-controls.test.ts` → `src/features/control-panel/__tests__/script-controls.test.ts`
- `src/content/__tests__/script-controls-integration.test.ts` → `src/features/control-panel/__tests__/script-controls-integration.test.ts`

**Files Deleted**:

- `src/content/control-panel.ts` (split into 3 feature files)

**Files Modified** (import/path updates):

- `src/content/content-lib.ts` - removed control-panel import and re-exports
- `src/content/content.ts` - imports `createControlPanel` from `features/control-panel/content/panel-ui`, `initPanelHideDuration` from `features/control-panel/content/panel-visibility`
- `src/content/__tests__/print-behavior.test.ts` - updated import path + added icons mock
- `src/content/__tests__/remove-play-buttons.test.ts` - updated import path + added icons mock

**Dynamic Imports Eliminated**:

- `import('./content-lib').then(({ setSpeechRate }) => ...)` → direct `import { setSpeechRate }`
- `import('../features/assets/content/icons').then(...)` → direct `import { getSvgIcon, isSvgPauseIcon }`
- `import('./highlight').then(({ clearHighlight }) => ...)` → direct `import { clearHighlight }`

**Test Results**:

- 23 test suites passed
- 371 tests passed

---

### ✅ Phase 8: Extract TTS Playback Feature (COMPLETED)

**Goal**: Extract core TTS playback logic from content-lib.ts to features/tts-playback/

**Tasks**:

- [x] Create `src/features/tts-playback/content/` structure
- [x] Extract text scanning → `src/features/tts-playback/content/text-processor.ts`
- [x] Extract play button logic → `src/features/tts-playback/content/play-button.ts`
- [x] Create `src/features/tts-playback/content/index.ts` as facade
- [x] Create `src/features/tts-playback/types.ts`
- [x] Move tests to `src/features/tts-playback/__tests__/`
- [x] Update imports in content.ts
- [x] Run `pnpm build`
- [x] Run `pnpm test`
- [x] Commit: "Phase 8: Extract TTS playback feature"

---

### ✅ Phase 9: Clean Up Entry Points (COMPLETED)

**Goal**: Simplify entry point files, remove content-lib.ts

**Tasks**:

- [x] Refactor `src/content/content.ts` to import from feature slices
- [x] Delete `src/content/content-lib.ts` (if fully extracted)
- [x] Refactor `src/popup/popup.ts` to import from features/auth/popup/ (already done in Phase 5)
- [x] Move `src/content/runtime-utils.ts` to `src/shared/api/messaging.ts` (if not done in Phase 1)
- [x] Update all remaining imports
- [x] Run `pnpm build`
- [x] Run `pnpm test`
- [x] Commit: "Phase 9: Clean up entry points"

**Files Deleted**:

- `src/content/content-lib.ts` (re-exported highlight functions, nothing imported it)
- `src/content/runtime-utils.ts` (functionality already in shared/api/messaging.ts)
- `src/content/__tests__/runtime-utils.test.ts` (moved to shared/)

**Files Created**:

- `src/shared/__tests__/messaging.test.ts` - Moved from content/__tests__/runtime-utils.test.ts, updated import paths

**Files Modified** (import/mock path updates):

- `src/content/content.ts` - `'./runtime-utils'` → `'../shared/api/messaging'`
- `src/features/tts-playback/content/text-processor.ts` - `'../../../content/runtime-utils'` → `'../../../shared/api/messaging'`
- `src/features/control-panel/content/panel-controller.ts` - `'../../../content/runtime-utils'` → `'../../../shared/api/messaging'`
- `src/content/__tests__/content.test.ts` - Updated jest.mock path
- `src/content/__tests__/print-behavior.test.ts` - Updated jest.mock path
- `src/content/__tests__/remove-play-buttons.test.ts` - Updated jest.mock path
- `src/features/control-panel/__tests__/control-panel.test.ts` - Updated jest.mock paths (runtime-utils + content-lib)
- `src/features/control-panel/__tests__/script-controls.test.ts` - Updated jest.mock path
- `src/features/control-panel/__tests__/script-controls-integration.test.ts` - Updated jest.mock path
- `src/features/tts-playback/__tests__/integration.test.ts` - Updated jest.mock path

**Test Results**:

- 23 test suites passed
- 371 tests passed

---

### ✅ Phase 10: Update Build Configuration (COMPLETED)

**Goal**: Verify all build scripts and manifest work with new structure

**Tasks**:

- [x] Verify esbuild entry points:
  - [x] `pnpm build:content` (src/content/content.ts) → dist/content/content.js (35.8kb)
  - [x] `pnpm build:popup` (src/popup/popup.ts) → dist/popup/popup.js (3.8kb)
  - [x] `pnpm build:sw` (src/background/service-worker.ts) → dist/background/service-worker.js (21.4kb)
  - [x] `pnpm build:options` (src/features/settings/options/options-ui.ts) → dist/options/options.js (10.6kb)
- [x] Update `package.json` publish script - replaced stale rm-f entries with new structure
- [x] `manifest.json` paths verified correct, no changes needed
- [x] Test full build: `pnpm run publish` - succeeded
- [x] Verify dist/ output structure - clean, only 10 needed files
- [x] Commit: "Phase 10: Update build configuration"

**Files Modified**:

- `package.json` - publish script updated: removed stale `dist/content/content-lib.js`, `dist/content/control-panel.js`, `dist/content/icons.js`, `dist/content/runtime-utils.js`, `dist/auth/`, `dist/types/`; added `dist/features/`, `dist/shared/`, `dist/background/tab-manager.js`

**Dist Output** (clean, 10 files):

- `dist/background/service-worker.js` (21.4kb)
- `dist/content/content.js` (35.8kb) + `dist/content/content.css`
- `dist/options/options.js` (10.6kb) + `dist/options/options.html` + `dist/options/options.css`
- `dist/popup/popup.js` (3.8kb) + `dist/popup/popup.html` + `dist/popup/popup.css`
- `dist/manifest.json`
- `dist/assets/svg/*.svg`

**Test Results**:

- 23 test suites passed
- 371 tests passed

---

### ⏳ Phase 11: Final Testing & Validation (PENDING)

**Goal**: Comprehensive testing to ensure everything works

**Tasks**:

- [ ] Run `pnpm test` (unit tests)
- [ ] **Ask user before running E2E tests**
- [ ] Run `pnpm test:e2e` (if approved)
- [ ] Manual testing in Chrome:
  - [ ] Load extension
  - [ ] Test play/pause buttons
  - [ ] Test control panel
  - [ ] Test context menu
  - [ ] Test options page
  - [ ] Test highlighting styles
  - [ ] Test auth (sign-in/sign-out)
- [ ] Verify no console errors
- [ ] Check bundle sizes
- [ ] Create architecture documentation
- [ ] Commit: "Phase 11: Final testing and validation"

---

## Documentation Tasks (After Phase 11)

- [ ] Create `docs/architecture.md` - Slice architecture explanation
- [ ] Create `docs/features/highlighting.md`
- [ ] Create `docs/features/control-panel.md`
- [ ] Create `docs/features/tts-playback.md`
- [ ] Create `docs/features/settings.md`
- [ ] Create `docs/features/auth.md`
- [ ] Create `docs/development-guide.md` - How to add new features

---

## Metrics

**Estimated Total Time**: 20-30 hours  
**Actual Time**: (To be tracked)

**File Count**:

- Before: ~14 TS source files
- After: ~35 TS source files (estimated)

**Average File Size**:

- Before: ~150-300 lines per file
- After: ~50-100 lines per file (estimated)

---

## Notes

- All changes must keep existing tests passing
- Only production code is modified, test code stays the same (except import paths)
- One commit per phase for clean git history
- Working in current branch (no separate feature branch)
