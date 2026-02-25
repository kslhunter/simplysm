# Phase 3: Test Description Translation Status

**Created:** 2026-02-25
**Target:** Translate all test case descriptions (describe/it/test) from Korean to English

## Overview

- **Total Test Files with Korean:** 78 files
- **Translated:** 5 files  
- **Remaining:** 73 files
- **Completion Rate:** 6.4%

## Progress by Package

### ✓ Completed (5 files)
#### sd-cli (5 files)
- [x] load-ignore-patterns.spec.ts
- [x] load-sd-config.spec.ts
- [x] copy-src.spec.ts
- [x] get-compiler-options-for-package.spec.ts
- [x] get-package-source-files.spec.ts

### ⏳ Pending (73 files)

#### core-common (25 files)
- types/: date-only, date-time, lazy-gc-map, time, uuid (5 files)
- utils/: bytes-utils, date-format, debounce-queue, json, number, object, path, primitive, sd-event-emitter, serial-queue, string, template-strings, transferable, wait, xml (15 files)
- extensions/: array-extension, map-extension, set-extension (3 files)
- errors/errors, zip/sd-zip (2 files)

#### orm-common (25 files)
- db-context/: create-db-context (1 file)
- ddl/: procedure-builder, relation-builder, table-builder, view-builder (4 files)
- dml/: delete, insert, update, upsert (4 files)
- select/: basic, filter, group, join, order, recursive-cte, result-meta, subquery, window (9 files)
- expr/: conditional (1 file)
- examples/: pivot, sampling, unpivot (3 files)
- errors/queryable-errors, exec/search-parser, escape, utils/result-parser, utils/result-parser-perf (5 files)

#### sd-cli (10 files)
- infra/: ResultCollector, SignalHandler, WorkerManager (3 files)
- parse-root-tsconfig, replace-deps, run-lint, run-typecheck, run-watch (5 files)
- sd-cli, utils/rebuild-manager (2 files)

#### core-node (4 files)
- utils/: fs-watcher, fs, path (3 files)
- worker/sd-worker (1 file)

#### Other Packages (9 files)
- excel/excel-wrapper (1 file)
- lint/: no-hard-private, no-subpath-imports-from-simplysm, recommended, ts-no-throw-not-implemented-error (4 files)
- service-common/: define-event, protocol/service-protocol (2 files)
- service-server/: define-service, service-executor (2 files)
- solid/: helpers/mergeStyles, hooks/createControllableSignal, hooks/createIMEHandler (3 files)

## Next Steps

1. **Continue with core-common** (25 files) - Most critical for general utilities
2. **Translate orm-common** (25 files) - Core database functionality
3. **Complete sd-cli** (10 remaining files)
4. **Other packages** (13 files)

## Translation Guidelines

### Pattern
```typescript
// Before
describe("한글 설명", () => {
  it("세부 설명", () => {
    // test code
  });
});

// After
describe("English description", () => {
  it("detailed description", () => {
    // test code
  });
});
```

### Notes
- Only translate test case descriptions (describe/it/test strings)
- Keep all code logic unchanged
- Keep code comments translations as they are (already done in Phase 1)
- Maintain consistent English style across all translations
- One commit per file or logical group of files

## Recommended Tools
- Manual editing with careful review for accuracy
- Use Find & Replace for common patterns per file
- Batch operations only for identical patterns

## Estimated Time
- 73 files remaining × ~5 minutes per file = ~365 minutes (~6 hours)
- With batching and patterns, could be reduced to ~2-3 hours

