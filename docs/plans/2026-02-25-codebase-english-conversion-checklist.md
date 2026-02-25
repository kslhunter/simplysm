# Codebase English Conversion — Package Checklist

**Status:** In Progress
**Last Updated:** 2026-02-25

---

## How to Use

Each package lists all conversion phases. Work top-to-bottom within each package (Phase 1 → 2 → 3), but Phase 4 can be done independently at any time.

**Status Symbols:**
- ✅ Phase 1 complete
- ❌ Phase 1 todo
- ⏳ Partially complete (some sub-parts done)
- ⚠️ Special handling required (keep some Korean)

---

## core-browser ✅

### Phase 1: Comments / JSDoc ✅

- [x] `element-ext.ts`
- [x] `html-element-ext.ts`
- [x] `index.ts`
- [x] `download.ts`
- [x] `fetch.ts`
- [x] `file-dialog.ts`

> Commit: `a9920e33f`

### Phase 2: Error / Log Messages

- [ ] core-browser error messages (package-level)

### Phase 3: Test Descriptions

- [ ] core-browser tests (~3 files)

### Phase 4: Metadata

- [ ] `packages/core-browser/package.json`

---

## core-node ✅

### Phase 1: Comments / JSDoc ✅

- [x] `fs-watcher.ts`
- [x] `fs.ts`
- [x] `path.ts`
- [x] `create-worker.ts`
- [x] `types.ts`
- [x] `worker.ts`

> Commit: `a9920e33f`

### Phase 2: Error / Log Messages

- [ ] core-node error messages (package-level)

### Phase 3: Test Descriptions

- [ ] core-node tests (~4 files)

### Phase 4: Metadata

- [ ] `packages/core-node/package.json`

---

## core-common ❌

### Phase 1: Comments / JSDoc

#### Errors (4 files)

- [ ] `errors/argument-error.ts`
- [ ] `errors/not-implemented-error.ts`
- [ ] `errors/sd-error.ts`
- [ ] `errors/timeout-error.ts`

#### Extensions (5 files)

- [ ] `extensions/arr-ext.ts`
- [ ] `extensions/arr-ext.helpers.ts`
- [ ] `extensions/arr-ext.types.ts`
- [ ] `extensions/map-ext.ts`
- [ ] `extensions/set-ext.ts`

#### Features (3 files)

- [ ] `features/debounce-queue.ts`
- [ ] `features/event-emitter.ts`
- [ ] `features/serial-queue.ts`

#### Types (5 files)

- [ ] `types/date-only.ts`
- [ ] `types/date-time.ts`
- [ ] `types/lazy-gc-map.ts`
- [ ] `types/time.ts`
- [ ] `types/uuid.ts`

#### Utils (13 files)

- [ ] `utils/bytes.ts`
- [ ] `utils/date-format.ts` ⚠️ Keep Korean locale data (`weekStrings`, `"오전"/"오후"`)
- [ ] `utils/error.ts`
- [ ] `utils/json.ts`
- [ ] `utils/num.ts`
- [ ] `utils/obj.ts`
- [ ] `utils/path.ts`
- [ ] `utils/primitive.ts`
- [ ] `utils/str.ts` ⚠️ Keep Korean particles (`"을"`, `"는"`, `"이"`, `"와"`, `"로"`, etc.)
- [ ] `utils/template-strings.ts`
- [ ] `utils/transferable.ts`
- [ ] `utils/wait.ts`
- [ ] `utils/xml.ts`

#### Root (4 files)

- [ ] `common.types.ts`
- [ ] `globals.ts`
- [ ] `index.ts`
- [ ] `zip/sd-zip.ts`

### Phase 2: Error / Log Messages

- [ ] core-common error messages (package-level)

### Phase 3: Test Descriptions

- [ ] core-common tests (~25 files)

### Phase 4: Metadata

- [ ] `packages/core-common/package.json`

### Phase 5: Function Naming

- [ ] Rename `strGetSuffix` → `koreanGetSuffix` (definition + export + all call sites)
- [ ] Handle Korean locale data in `date-format.ts` (**Decision required**: A=Convert to English / B=Keep Korean / C=Make locale-configurable)

---

## service-common ✅

### Phase 1: Comments / JSDoc ✅

- [x] 5 source files (all)

> Commit: `a9920e33f`

### Phase 2: Error / Log Messages

- [ ] service-common error messages (package-level)

### Phase 3: Test Descriptions

- [ ] service-common tests

### Phase 4: Metadata

- [ ] `packages/service-common/package.json`

---

## service-client ✅

### Phase 1: Comments / JSDoc ✅

- [x] 10 source files (all)

> Commit: `a9920e33f`

### Phase 2: Error / Log Messages

- [ ] service-client error messages (package-level)

### Phase 3: Test Descriptions

- [ ] service-client tests

### Phase 4: Metadata

- [ ] `packages/service-client/package.json`

---

## service-server ✅

### Phase 1: Comments / JSDoc ✅

- [x] 13 source files (all)

> Commit: `a9920e33f`

### Phase 2: Error / Log Messages

- [ ] service-server error messages (package-level)

### Phase 3: Test Descriptions

- [ ] service-server tests

### Phase 4: Metadata

- [ ] `packages/service-server/package.json`

---

## orm-common ❌

### Phase 1: Comments / JSDoc

#### Core (3 files)

- [ ] `create-db-context.ts`
- [ ] `index.ts`
- [ ] `common.types.ts`

#### DDL (5 files)

- [ ] `ddl/column-ddl.ts`
- [ ] `ddl/initialize.ts`
- [ ] `ddl/relation-ddl.ts`
- [ ] `ddl/schema-ddl.ts`
- [ ] `ddl/table-ddl.ts`

#### Errors (1 file)

- [ ] `errors/db-transaction-error.ts`

#### Execution (3 files)

- [ ] `executable.ts`
- [ ] `queryable.ts`
- [ ] `search-parser.ts`

#### Expressions (2 files)

- [ ] `expressions/expr-unit.ts`
- [ ] `expressions/expr.ts`

#### Query Builder (9 files)

- [ ] `query-builder/base/expr-renderer-base.ts`
- [ ] `query-builder/base/query-builder-base.ts`
- [ ] `query-builder/mssql/mssql-expr-renderer.ts`
- [ ] `query-builder/mssql/mssql-query-builder.ts`
- [ ] `query-builder/mysql/mysql-expr-renderer.ts`
- [ ] `query-builder/mysql/mysql-query-builder.ts`
- [ ] `query-builder/postgresql/postgresql-expr-renderer.ts`
- [ ] `query-builder/postgresql/postgresql-query-builder.ts`
- [ ] `query-builder/query-builder.ts`

#### Schema (6 files)

- [ ] `schema/column-builder.ts`
- [ ] `schema/index-builder.ts`
- [ ] `schema/procedure-builder.ts`
- [ ] `schema/relation-builder.ts`
- [ ] `schema/table-builder.ts`
- [ ] `schema/view-builder.ts`

#### Types (4 files)

- [ ] `types/column.ts`
- [ ] `types/db.ts`
- [ ] `types/expr.ts`
- [ ] `types/query-def.ts`

#### Utils (1 file)

- [ ] `utils/result-parser.ts`

### Phase 2: Error / Log Messages

- [ ] orm-common error messages (package-level)

### Phase 3: Test Descriptions

- [ ] orm-common tests (~38 files)

### Phase 4: Metadata

- [ ] `packages/orm-common/package.json`

---

## orm-node ❌

### Phase 1: Comments / JSDoc

- [ ] `create-db-conn.ts`
- [ ] `create-orm.ts`
- [ ] 6 other source files (~8 total)

### Phase 2: Error / Log Messages

- [ ] orm-node error messages (package-level)

### Phase 3: Test Descriptions

- [ ] orm integration tests (~9 files)

### Phase 4: Metadata

- [ ] `packages/orm-node/package.json`
- [ ] `tests/orm/package.json`

---

## solid ⏳

> `hooks / providers / utils` ✅ | `components` ❌

### Phase 1: Comments / JSDoc

#### hooks / providers / utils (~35 files) ✅

- [x] `createIMEHandler.ts`
- [x] `createSelectionGroup.tsx`
- [x] other hooks, providers, utils (~35 files total)

> Commit: `100ab1092`

#### components/data (~30 files) ❌

- [ ] `data/calendar/Calendar.tsx` ⚠️ Keep Korean weekday constants (`WEEKS`)
- [ ] `data/calendar/CalendarControl.tsx`
- [ ] `data/calendar/CalendarView.tsx`
- [ ] `data/kanban/Kanban.tsx`
- [ ] `data/kanban/KanbanBoard.tsx`
- [ ] `data/kanban/KanbanCard.tsx`
- [ ] `data/kanban/KanbanColumn.tsx`
- [ ] `data/kanban/KanbanLane.tsx`
- [ ] `data/list/List.tsx`
- [ ] `data/list/ListControl.tsx`
- [ ] `data/list/ListItem.tsx`
- [ ] `data/table/` — ~15+ files

#### components/display (~15 files) ❌

- [ ] icon, badge, label, and others

#### components/input (~20 files) ❌

- [ ] text-input, select, checkbox, and others

#### components/layout (~15 files) ❌

- [ ] sidebar, topbar, modal, and others

### Phase 2: Error / Log Messages

- [ ] solid error/alert messages (package-level)

### Phase 3: Test Descriptions

- [ ] solid tests (~74 files)

### Phase 4: Metadata

- [ ] `packages/solid/package.json`

### Phase 5: Function Naming

- [ ] Handle Korean weekday constants in `Calendar.tsx` (Decision pending: same as `date-format.ts` in Phase 5)

---

## solid-demo ✅

### Phase 1: Comments / JSDoc ✅

- [x] 46 source files (all)

> Commit: `347131439`

### Phase 2: Error / Log Messages

- [ ] solid-demo UI text strings (alert messages, user-facing text)

### Phase 3: Test Descriptions

- [ ] solid-demo tests

### Phase 4: Metadata

- [ ] `packages/solid-demo/package.json`

---

## solid-demo-server ✅

### Phase 1: Comments / JSDoc ✅

- [x] 2 source files (all)

> Commit: `347131439`

### Phase 2: Error / Log Messages

- [ ] solid-demo-server error messages (package-level)

### Phase 3: Test Descriptions

- [ ] solid-demo-server tests

### Phase 4: Metadata

- [ ] `packages/solid-demo-server/package.json`

---

## excel ✅

### Phase 1: Comments / JSDoc ✅

- [x] 18 source files (all)

> Commit: `3852b1583`

### Phase 2: Error / Log Messages

- [ ] excel error messages (package-level)

### Phase 3: Test Descriptions

- [ ] excel tests (~8 files)

### Phase 4: Metadata

- [ ] `packages/excel/package.json`
- [ ] Zod schema descriptions in `packages/excel/tests/excel-wrapper.spec.ts`
  - `.describe("이름")` → `.describe("name")`

---

## storage ✅

### Phase 1: Comments / JSDoc ✅

- [x] 3 source files (all)

> Commit: `3852b1583`

### Phase 2: Error / Log Messages

- [ ] storage error messages (package-level)

### Phase 3: Test Descriptions

- [ ] storage tests (~3 files)

### Phase 4: Metadata

- [ ] `packages/storage/package.json`

---

## capacitor-plugins ✅

> 4 sub-packages: `capacitor-file-system`, `capacitor-keyboard`, `capacitor-navigation`, `capacitor-toast`

### Phase 1: Comments / JSDoc ✅

- [x] 12 source files across all 4 plugins (all)

> Commit: `3852b1583`

### Phase 2: Error / Log Messages

- [ ] capacitor-plugins error messages (package-level)

### Phase 3: Test Descriptions

- [ ] capacitor-plugins tests

### Phase 4: Metadata

- [ ] `packages/capacitor-file-system/package.json`
- [ ] `packages/capacitor-keyboard/package.json`
- [ ] `packages/capacitor-navigation/package.json`
- [ ] `packages/capacitor-toast/package.json`

---

## sd-cli ❌

### Phase 1: Comments / JSDoc

- [ ] `builders/` — all builder files
- [ ] `commands/` — all command files
- [ ] `orchestrators/` — all orchestrator files
- [ ] `utils/` — all util files
- [ ] ~50 source files total

### Phase 2: Error / Log Messages

- [ ] sd-cli error/log messages (package-level)

### Phase 3: Test Descriptions

- [ ] sd-cli tests (~18 files)

### Phase 4: Metadata

- [ ] `packages/sd-cli/package.json`

---

## sd-claude ❌

### Phase 1: Comments / JSDoc

- [ ] `install.ts`
- [ ] `sd-claude.ts`

### Phase 2: Error / Log Messages

- [ ] sd-claude error messages (package-level)

### Phase 3: Test Descriptions

- [ ] sd-claude tests

### Phase 4: Metadata

- [ ] `packages/sd-claude/package.json`

---

## lint ❌

### Phase 1: Comments / JSDoc

- [ ] 6 source files

### Phase 2: Error / Log Messages

- [ ] lint error messages (package-level)

### Phase 3: Test Descriptions

- [ ] lint tests (~4 files)

### Phase 4: Metadata

- [ ] `packages/lint/package.json`

---

## tsconfig.json ❌

### Phase 1: Comments

- [ ] Root `tsconfig.json` — 4 Korean comment lines

> Note: No Phase 2/3/5. Phase 4 metadata not applicable.

---

## Cross-Package Items

### Phase 4: Metadata (Independent — can be done any time)

- [ ] `package.json` (root)
- [ ] `.prettierrc.yaml` — 12 inline Korean comments
- [ ] `tests/orm/docker-compose.test.yml` — block comments
- [ ] `tests/orm/package.json`
- [ ] `tests/service/package.json`

> All `package.json` changes: `"author": "김석래"` → `"author": "simplysm"`, translate descriptions

### Phase 5: Function Naming (Run Last — renames affect all call sites)

- [ ] Rename `strGetSuffix` → `koreanGetSuffix`
  - Definition: `packages/core-common/src/utils/str.ts`
  - Export: `packages/core-common/src/index.ts`
  - Tests: `packages/core-common/tests/utils/string.spec.ts`
  - Call sites: grep all usage before renaming
- [ ] Korean locale data final decision:
  - `packages/core-common/src/utils/date-format.ts`: `weekStrings`, `"오전"/"오후"`
  - `packages/solid/src/components/data/calendar/Calendar.tsx`: `WEEKS`
  - Options: **A)** Convert to English | **B)** Keep Korean | **C)** Make locale-configurable

---

## Progress Summary

| Package | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---------|:-------:|:-------:|:-------:|:-------:|:-------:|
| core-browser | ✅ | ❌ | ❌ | ❌ | — |
| core-node | ✅ | ❌ | ❌ | ❌ | — |
| core-common | ❌ | ❌ | ❌ | ❌ | ❌ |
| service-common | ✅ | ❌ | ❌ | ❌ | — |
| service-client | ✅ | ❌ | ❌ | ❌ | — |
| service-server | ✅ | ❌ | ❌ | ❌ | — |
| orm-common | ❌ | ❌ | ❌ | ❌ | — |
| orm-node | ❌ | ❌ | ❌ | ❌ | — |
| solid (hooks/utils) | ✅ | ❌ | ❌ | ❌ | — |
| solid (components) | ❌ | ❌ | ❌ | ❌ | ❌ |
| solid-demo | ✅ | ❌ | ❌ | ❌ | — |
| solid-demo-server | ✅ | ❌ | ❌ | ❌ | — |
| excel | ✅ | ❌ | ❌ | ❌ | — |
| storage | ✅ | ❌ | ❌ | ❌ | — |
| capacitor-plugins | ✅ | ❌ | ❌ | ❌ | — |
| sd-cli | ❌ | ❌ | ❌ | ❌ | — |
| sd-claude | ❌ | ❌ | ❌ | ❌ | — |
| lint | ❌ | ❌ | ❌ | ❌ | — |
| tsconfig.json | ❌ | — | — | — | — |

**Phase 1:** 11/19 complete (solid split: hooks ✅, components ❌)

---

## Legend

- ✅ Done: Merged into main branch
- ❌ Todo: Awaiting work
- ⏳ Partially complete
- ⚠️ Special handling required (some Korean must be kept)
- — Not applicable
