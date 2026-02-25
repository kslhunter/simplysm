# Codebase English Conversion — Incremental Checklist

**Status:** In Progress
**Last Updated:** 2026-02-25
**Design:** `docs/plans/2026-02-24-codebase-english-conversion-design.md`

---

## Overview

Progressive conversion of Korean text to English, one package at a time. Each task is:
- **Atomic**: converts one package's comments, errors, tests, metadata
- **Verifiable**: `pnpm build`, `pnpm vitest --run`, commit
- **Independent**: can be done in any order

---

## Phase 1 Status: Comments / JSDoc / Regions

### Core Packages

#### ✅ Done
- [x] **core-browser** — 6 source files (comments, regions, JSDoc)
  - Completed in: `a9920e33f` (main)
  - Files: `element-ext.ts`, `html-element-ext.ts`, `index.ts`, `download.ts`, `fetch.ts`, `file-dialog.ts`

- [x] **core-node** — 6 source files
  - Completed in: `a9920e33f` (main)
  - Files: `fs-watcher.ts`, `fs.ts`, `path.ts`, `create-worker.ts`, `types.ts`, `worker.ts`

#### ❌ Todo
- [ ] **core-common** — ~34 source files
  - Status: **BLOCKED** — most files in scope
  - Estimate: 3-4 hours of focused work
  - Key exemptions:
    - `str.ts`: Keep Korean particles (`"을"`, `"는"`, `"이"`, `"와"`, `"로"`, etc.) and char mapping tables
    - `date-format.ts`: Keep Korean locale data (`["일", "월", ...]`, `"오전"/"오후"`) — **DECISION PENDING**
  - Files to translate:
    ```
    errors/argument-error.ts, not-implemented-error.ts, sd-error.ts, timeout-error.ts
    extensions/arr-ext.ts, arr-ext.helpers.ts, arr-ext.types.ts, map-ext.ts, set-ext.ts
    features/debounce-queue.ts, event-emitter.ts, serial-queue.ts
    globals.ts, index.ts
    types/date-only.ts, date-time.ts, lazy-gc-map.ts, time.ts, uuid.ts
    utils/bytes.ts, error.ts, json.ts, num.ts, obj.ts, path.ts, primitive.ts, str.ts*,
           template-strings.ts, transferable.ts, wait.ts, xml.ts
    zip/sd-zip.ts
    ```

### ORM Packages

#### ❌ Todo
- [ ] **orm-common** — ~32 source files
  - Estimate: 4-5 hours
  - Key files: `create-db-context.ts`, `queryable.ts`, `expr.ts`, all DDL/query-builder files

- [ ] **orm-node** — ~8 source files
  - Estimate: 1 hour
  - Key files: `create-db-conn.ts`, `create-orm.ts`, connection files

### Service Packages

#### ✅ Done
- [x] **service-common** — 5 source files
  - Completed in: `a9920e33f` (main)

- [x] **service-client** — 10 source files
  - Completed in: `a9920e33f` (main)

- [x] **service-server** — 13 source files
  - Completed in: `a9920e33f` (main)

### UI / SolidJS Packages

#### ✅ Done
- [x] **solid/src/hooks** — hooks, providers, utils
  - Completed in: `100ab1092` (main)
  - Files: `createIMEHandler.ts`, `createSelectionGroup.tsx`, other hooks

- [x] **solid-demo** — 46 source files
  - Completed in: `347131439` (main)

- [x] **solid-demo-server** — 2 source files
  - Completed in: `347131439` (main)

#### ❌ Todo
- [ ] **solid/src/components** — ~80 source files
  - Estimate: 5-6 hours
  - Subdirectories:
    - `components/data/` — calendar, kanban, list, table
    - `components/display/` — icon, badge, label, etc.
    - `components/input/` — text input, select, checkbox, etc.
    - `components/layout/` — sidebar, topbar, modal, etc.
  - Key exemption: Calendar component has Korean weekday constants

### Tooling / Build Packages

#### ❌ Todo
- [ ] **sd-cli** — ~50 source files
  - Estimate: 3-4 hours
  - Key files: builders, commands, orchestrators, utils

- [ ] **sd-claude** — 2 source files
  - Estimate: 30 mins
  - Files: `install.ts`, `sd-claude.ts`

- [ ] **lint** — 6 source files
  - Estimate: 1 hour

#### ✅ Done
- [x] **excel** — 18 source files
  - Completed in: `3852b1583` (main)

- [x] **storage** — 3 source files
  - Completed in: `3852b1583` (main)

- [x] **capacitor-plugins** — 12 source files
  - Completed in: `3852b1583` (main)

### Config Files

#### ❌ Todo
- [ ] **tsconfig.json** — root config
  - Estimate: 5 mins
  - Lines with Korean: 4 comment lines

---

## Phase 2 Status: Error / Log Messages

**Dependency:** Requires Phase 1 complete for all test assertions to work

#### ⏳ Pending (Phase 1 completion)
- [ ] **core-common** error messages
- [ ] **core-browser** error messages
- [ ] **core-node** error messages
- [ ] **orm-common** error messages
- [ ] **orm-node** error messages
- [ ] **solid** error/alert messages
- [ ] **solid-demo** UI text strings (alert, user-facing text)
- [ ] **sd-cli** error/log messages
- [ ] **service-*** error messages

---

## Phase 3 Status: Test Descriptions

**Dependency:** Requires Phase 2 complete (error message assertions)

#### ⏳ Pending (Phase 2 completion)
- [ ] **core-common** tests (~25 files)
- [ ] **core-browser** tests (~3 files)
- [ ] **core-node** tests (~4 files)
- [ ] **orm-common** tests (~38 files)
- [ ] **orm** integration tests (~9 files)
- [ ] **solid** tests (~74 files) — largest batch
- [ ] **sd-cli** tests (~18 files)
- [ ] **excel** tests (~8 files)
- [ ] **lint** tests (~4 files)
- [ ] **storage** tests (~3 files)
- [ ] **service** tests & integration tests

---

## Phase 4 Status: Metadata / Config

**Dependency:** Independent of other phases

#### ❌ Todo
- [ ] **package.json** files
  - Root: `package.json` (description, author)
  - 20 packages: `packages/*/package.json`
  - 2 integration tests: `tests/orm/package.json`, `tests/service/package.json`
  - Changes: `"author": "김석래"` → `"author": "simplysm"`, translate descriptions

- [ ] **YAML config files**
  - `.prettierrc.yaml` — 12 inline comments (all Korean)
  - `tests/orm/docker-compose.test.yml` — block comments

- [ ] **Zod schema descriptions** (test fixtures)
  - `packages/excel/tests/excel-wrapper.spec.ts` — `.describe("이름")` → `.describe("name")`

---

## Phase 5 Status: Function Naming Clarification

**Dependency:** Run last (renames affect all call sites)

#### ❌ Todo
- [ ] **Rename `strGetSuffix` → `koreanGetSuffix`**
  - Definition: `packages/core-common/src/utils/str.ts`
  - Export: `packages/core-common/src/index.ts`
  - Tests: `packages/core-common/tests/utils/string.spec.ts`
  - Call sites: grep for all usage (likely none in source, only export)

- [ ] **Handle Korean locale data** (DECISION POINT)
  - `packages/core-common/src/utils/date-format.ts`: `weekStrings`, `"오전"/"오후"`
  - `packages/solid/src/components/data/calendar/Calendar.tsx`: `WEEKS`
  - Options:
    - **A) Convert to English** (`["Sun", "Mon", ...]`, `"AM"/"PM"`)
    - **B) Keep as Korean** (runtime behavior unchanged)
    - **C) Make locale-configurable** (most effort)

---

## Final Verification

#### ❌ Todo
- [ ] **Comprehensive scan**
  - Run: `grep -rn '[가-힣]' packages/*/src/ packages/*/tests/ tests/ --include='*.ts' --include='*.tsx'`
  - Verify remaining Korean is ONLY in exempted categories:
    - Korean particles in `koreanGetSuffix` function
    - Korean character mapping tables (Choseong/Jungseong/Jongseong)
    - Korean encoding test data
    - Korean locale data (if user chose option B in Phase 5)

- [ ] **Full build & test**
  - `pnpm build` — all packages
  - `pnpm vitest --run` — all tests
  - All must pass

---

## Recommended Execution Order

**Week 1: Core & ORM (Phase 1)**
1. [ ] core-common (largest core package)
2. [ ] orm-common (largest orm package)
3. [ ] orm-node (quick, depends on orm-common done)

**Week 2: UI & Tooling (Phase 1)**
4. [ ] solid/src/components (largest ui package)
5. [ ] sd-cli (largest tooling package)
6. [ ] sd-claude + lint (quick)
7. [ ] tsconfig.json (quick)

**Week 3: Tests (Phase 3, after Phase 1+2)**
8. [ ] solid tests (largest, can start while others finish)
9. [ ] orm-common tests
10. [ ] core-common tests

**Week 4: Metadata & Cleanup (Phase 4+5)**
11. [ ] package.json files (Phase 4)
12. [ ] YAML config files (Phase 4)
13. [ ] Rename koreanGetSuffix (Phase 5)
14. [ ] Final verification

---

## Notes

### Exemptions (Keep Korean)
- Korean particle literals: `"을"`, `"를"`, `"은"`, `"는"`, `"이"`, `"가"`, `"와"`, `"과"`, `"랑"`, `"로"`, `"이라"`
- Korean character decomposition data: Choseong, Jungseong, Jongseong arrays
- Korean encoding test data: `"한글 내용"` in zip/excel tests
- Korean locale data: day names, AM/PM (unless user chooses to convert in Phase 5)

### Translation Consistency
- Same Korean term should always map to the same English term
- Example: `구현` → `Implementation` (not `Implement`, `Implementation Details`, etc.)

### Build & Test Strategy
- After each package: `pnpm build [package-name]`, `pnpm vitest [package-name]`
- After Phase 1 complete: `pnpm build`, `pnpm vitest --run`
- After Phase 2: Run Phase 3 tests to catch assertion mismatches

### Commits
- One commit per package (or logical grouping)
- Message format: `refactor: convert Korean comments to English in [package-name]`
- Include affected file count in message body if >20 files

---

## Legend

- ✅ **Done**: Merged into main branch
- ❌ **Todo**: Awaiting work
- ⏳ **Pending**: Depends on previous phase completion
- 🔓 **Decision Pending**: Awaits user input before proceeding

