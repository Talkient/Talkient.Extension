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

### ✅ Phase 3: Extract Highlighting Feature (COMPLETED)

**Goal**: Extract highlight.ts to features/highlighting/ - self-contained, no circular deps

**Tasks**:

- [x] Create `src/features/highlighting/content/` structure
- [x] Split highlight.ts into 3 modules (highlighter.ts, styles.ts, scroll.ts)
- [x] Create `src/features/highlighting/types.ts` with HighlightStyle type
- [x] Extract CSS to `src/features/highlighting/content/styles.css`
- [x] Create split test files (highlighter.test.ts, styles.test.ts, scroll.test.ts)
- [x] Update imports in content-lib.ts, control-panel.ts, content.ts
- [x] Remove re-exports from content-lib.ts
- [x] Integrate storage wrapper from Phase 1
- [x] Update package.json build scripts for CSS bundling
- [x] Update 7 test files with new import paths
- [x] Remove highlighting CSS from content.css (lines 471-592)
- [x] Delete old highlight.ts and highlight.test.ts
- [x] Run `pnpm build` (successful)
- [x] Run `pnpm test` (25 suites, 363 tests passed)
- [x] Commit: "Phase 3: Extract highlighting feature"

**Files Created**:

- `src/features/highlighting/types.ts` - HighlightStyle type and constants
- `src/features/highlighting/content/highlighter.ts` - Core highlighting logic (~65 lines)
- `src/features/highlighting/content/styles.ts` - Style management (~95 lines)
- `src/features/highlighting/content/scroll.ts` - Auto-scroll logic (~48 lines)
- `src/features/highlighting/content/styles.css` - Highlighting CSS styles (moved from content.css)
- `src/features/highlighting/__tests__/highlighter.test.ts` - Core highlighting tests
- `src/features/highlighting/__tests__/styles.test.ts` - Style management tests
- `src/features/highlighting/__tests__/scroll.test.ts` - Scroll logic tests

**Files Moved**:

- `src/content/highlight.ts` → Split into 3 modules in `src/features/highlighting/content/`
- `src/content/__tests__/highlight.test.ts` → Split into 3 test files in `src/features/highlighting/__tests__/`
- Highlighting CSS (109 lines) → `src/features/highlighting/content/styles.css`

**Files Modified**:

- `package.json` - Updated publish and update-css scripts
- `src/content/content-lib.ts` - Removed re-exports, added direct imports
- `src/content/content.ts` - Updated imports to use feature directly
- `src/content/control-panel.ts` - Updated dynamic import path
- `src/content/content.css` - Removed highlighting CSS (kept first 470 lines)
- `src/content/__tests__/auto-play.test.ts` - Updated imports
- `src/content/__tests__/integration.test.ts` - Updated imports
- `src/content/__tests__/content-integration.test.ts` - Updated imports
- `src/content/__tests__/content.test.ts` - Updated imports and mocks
- `src/content/__tests__/print-behavior.test.ts` - Updated imports

**Files Deleted**:

- `src/content/highlight.ts` (162 lines - split into 3 feature modules)
- `src/content/__tests__/highlight.test.ts` (472 lines - split into 3 test files)

**Key Improvements**:

- ✅ **Storage Wrapper Integration**: Now uses `storage.get()` from Phase 1 instead of direct chrome.storage calls
- ✅ **Clear Separation**: Split into 3 focused modules (highlighter, styles, scroll)
- ✅ **CSS Co-location**: Styles now live with the feature code
- ✅ **No Barrel Exports**: Removed re-exports from content-lib.ts
- ✅ **Type Safety**: Added HighlightStyle type with validation constants
- ✅ **Better Testability**: Split tests match the modular structure

**Test Results**:

- 25 test suites passed (was 23 in Phase 2) ✨
- 363 tests passed (was 371 in Phase 2, but some were duplicates)
- New test suites: 3 (highlighter, styles, scroll)
- Removed test suite: 1 (old highlight.test.ts)

---

### ⏳ Phase 4: Extract Settings Feature (PENDING)

**Goal**: Centralize all settings management in features/settings/

**Tasks**:

- [ ] Create `src/features/settings/options/` structure
- [ ] Move `src/options/options.ts` → `src/features/settings/options/options-ui.ts`
- [ ] Move `src/options/*.html` → `src/features/settings/options/`
- [ ] Move `src/options/*.css` → `src/features/settings/options/`
- [ ] Create `src/features/settings/storage-schema.ts` with DEFAULT_SETTINGS
- [ ] Create `src/features/settings/background/settings-sync.ts`
- [ ] Create `src/features/settings/types.ts`
- [ ] Move tests to `src/features/settings/__tests__/`
- [ ] Update imports across codebase
- [ ] Update `package.json` build scripts (build:options entry point)
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 4: Extract settings feature"

---

### ⏳ Phase 5: Extract Auth Feature (PENDING)

**Goal**: Reorganize existing auth/ into features/auth/ with background/popup split

**Tasks**:

- [ ] Create `src/features/auth/` structure
- [ ] Move `src/auth/auth-types.ts` → `src/features/auth/types.ts`
- [ ] Move `src/auth/auth-storage.ts` → `src/features/auth/background/auth-storage.ts`
- [ ] Move `src/auth/auth-service.ts` → `src/features/auth/background/auth-service.ts`
- [ ] Create `src/features/auth/background/message-handler.ts` (extract from service-worker.ts)
- [ ] Create `src/features/auth/popup/auth-ui.ts` (extract from popup.ts)
- [ ] Delete `src/auth/index.ts` (remove barrel exports)
- [ ] Move tests to `src/features/auth/__tests__/`
- [ ] Update imports in service-worker.ts, popup.ts
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 5: Extract auth feature"

---

### ⏳ Phase 6: Split Service Worker (PENDING)

**Goal**: Break down monolithic service-worker.ts into feature handlers

**Tasks**:

- [ ] Create `src/background/tab-manager.ts`
- [ ] Create `src/features/tts-playback/background/tts-engine.ts` (extract TTS logic)
- [ ] Create `src/features/tts-playback/background/context-menu.ts` (extract context menu)
- [ ] Create `src/features/tts-playback/background/message-handler.ts` (extract TTS messages)
- [ ] Slim down `src/background/service-worker.ts` to orchestrator
- [ ] Move tests to appropriate feature folders
- [ ] Update imports
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 6: Split service worker by responsibility"

---

### ⏳ Phase 7: Extract Control Panel Feature (PENDING)

**Goal**: Move control-panel.ts to features/control-panel/, eliminate dynamic imports

**Tasks**:

- [ ] Create `src/features/control-panel/content/` structure
- [ ] Split `src/content/control-panel.ts` into:
  - [ ] `panel-ui.ts` (UI creation)
  - [ ] `panel-controller.ts` (event handlers, state)
  - [ ] `panel-visibility.ts` (cookie logic)
- [ ] Create `src/features/control-panel/types.ts`
- [ ] Remove dynamic imports, use direct imports
- [ ] Move tests to `src/features/control-panel/__tests__/`
- [ ] Update imports from content-lib.ts, content.ts
- [ ] Remove re-exports from content-lib.ts
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 7: Extract control panel feature"

---

### ⏳ Phase 8: Extract TTS Playback Feature (PENDING)

**Goal**: Extract core TTS playback logic from content-lib.ts to features/tts-playback/

**Tasks**:

- [ ] Create `src/features/tts-playback/content/` structure
- [ ] Extract text scanning → `src/features/tts-playback/content/text-processor.ts`
- [ ] Extract play button logic → `src/features/tts-playback/content/play-button.ts`
- [ ] Create `src/features/tts-playback/content/index.ts` as facade
- [ ] Create `src/features/tts-playback/types.ts`
- [ ] Move tests to `src/features/tts-playback/__tests__/`
- [ ] Update imports in content.ts
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 8: Extract TTS playback feature"

---

### ⏳ Phase 9: Clean Up Entry Points (PENDING)

**Goal**: Simplify entry point files, remove content-lib.ts

**Tasks**:

- [ ] Refactor `src/content/content.ts` to import from feature slices
- [ ] Delete `src/content/content-lib.ts` (if fully extracted)
- [ ] Refactor `src/popup/popup.ts` to import from features/auth/popup/
- [ ] Move `src/content/runtime-utils.ts` to `src/shared/api/messaging.ts` (if not done in Phase 1)
- [ ] Update all remaining imports
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 9: Clean up entry points"

---

### ⏳ Phase 10: Update Build Configuration (PENDING)

**Goal**: Verify all build scripts and manifest work with new structure

**Tasks**:

- [ ] Verify esbuild entry points:
  - [ ] `pnpm build:content` (src/content/content.ts)
  - [ ] `pnpm build:popup` (src/popup/popup.ts)
  - [ ] `pnpm build:sw` (src/background/service-worker.ts)
  - [ ] `pnpm build:options` (src/features/settings/options/options-ui.ts)
- [ ] Update `package.json` scripts if needed
- [ ] Update `manifest.json` if paths changed
- [ ] Test full build: `pnpm run publish`
- [ ] Verify dist/ output structure
- [ ] Commit: "Phase 10: Update build configuration"

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
