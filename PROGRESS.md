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

- (To be listed after completion)

---

### ⏳ Phase 2: Extract Assets Feature (PENDING)

**Goal**: Extract icons.ts to features/assets/ - smallest, zero-dependency slice

**Tasks**:

- [ ] Create `src/features/assets/content/` structure
- [ ] Move `src/content/icons.ts` → `src/features/assets/content/icons.ts`
- [ ] Extract caching logic to `src/features/assets/content/icon-cache.ts`
- [ ] Create `src/features/assets/types.ts`
- [ ] Move tests to `src/features/assets/__tests__/`
- [ ] Update imports in all files using icons.ts
- [ ] Run `pnpm build`
- [ ] Run `pnpm test`
- [ ] Commit: "Phase 2: Extract assets feature"

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
