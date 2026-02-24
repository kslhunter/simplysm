# Codebase English Conversion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert all Korean text in source files to English, making the repository appear as maintained by English-speaking developers.

**Architecture:** Phase-by-phase conversion (comments → errors → tests → metadata → naming). Each phase is committed independently. Korean language processing literals (particles, encoding test data, mapping tables) are preserved as-is.

**Tech Stack:** TypeScript, pnpm, vitest, grep

**Design doc:** `docs/plans/2026-02-24-codebase-english-conversion-design.md`

---

## Global Rules

### Scope

- **Target:** Source files only
- **Exclude:** `dist/`, `.back/`, `docs/`, `node_modules/`, `.claude/`

### Translation Style

- **Default:** Concise (e.g., `// 구현` → `// Implementation`)
- **Complex logic:** Add descriptive supplement (e.g., multi-line comments explaining algorithms get a clarifying second line)
- **Terminology consistency:** Same Korean term → same English translation across all files

### Exemptions — Keep Korean

| Pattern | Example | Reason |
|---------|---------|--------|
| Korean particle literals | `"을"`, `"는"`, `"이"`, `"와"` | Korean suffix processing logic |
| Korean char mapping tables | Choseong/Jungseong/Jongseong arrays | Korean character decomposition data |
| Korean encoding test data | `"한글 내용"` in zip/excel tests | Verifies Korean encoding support |

### Verification Commands

```bash
# Scan for remaining Korean in source files (exclude exempted)
grep -rn '[가-힣]' packages/*/src/ --include='*.ts' --include='*.tsx' | grep -v 'node_modules'

# Build check
pnpm build

# Test check
pnpm vitest --run
```

### Decision Point — Korean Locale Data

The following Korean strings are **runtime locale data**, not comments or messages. They change UI behavior if converted:

- `packages/core-common/src/utils/date-format.ts`: `weekStrings = ["일", "월", ...]`, `"오전"/"오후"`
- `packages/solid/src/components/data/calendar/Calendar.tsx`: `WEEKS = ["일", "월", ...]`

**Action:** Ask the user before converting these. If converting, use English equivalents (`["Sun", "Mon", ...]`, `"AM"/"PM"`).

---

## Phase 1 — Comments / JSDoc / Regions

**Target:** `//` comments, `/* */` blocks, `//#region` labels, `/** JSDoc */`
**File types:** `.ts`, `.tsx` (source only, not tests)
**Total:** ~367 source files

### Task 1: core-common, core-browser, core-node

**Files (~46 source files):**
- `packages/core-common/src/**/*.ts` (34 files)
- `packages/core-browser/src/**/*.ts` (6 files)
- `packages/core-node/src/**/*.ts` (6 files)

**Step 1: Scan Korean comments**

```bash
grep -rn '[가-힣]' packages/core-common/src/ packages/core-browser/src/ packages/core-node/src/ --include='*.ts' --include='*.tsx'
```

**Step 2: Translate all Korean comments to English**

For each file: read → identify Korean in comments/JSDoc/regions → translate to English → edit.

Exemption: In `packages/core-common/src/utils/str.ts`, keep Korean particle literals (`"을"`, `"는"`, etc.) and Choseong/Jungseong/Jongseong mapping tables. Translate the surrounding comments to English.

Example translations:
```ts
// Before
//#region 한글 조사 처리
/** 비동기 필터 (순차 실행) */
// 주의 시작 요일 기준으로 현재 날짜의 요일 인덱스 계산 (0 = 주 시작일)

// After
//#region Korean particle processing
/** Async filter (sequential execution) */
// Calculate day-of-week index relative to the starting day (0 = week start).
// Adjusts the raw day index so that the configured start day maps to 0.
```

**Step 3: Verify no untranslated Korean remains**

```bash
grep -rn '[가-힣]' packages/core-common/src/ packages/core-browser/src/ packages/core-node/src/ --include='*.ts' --include='*.tsx'
```

Expected: Only exempted Korean literals in `str.ts` and `date-format.ts`.

**Step 4: Build verification**

```bash
pnpm build core-common && pnpm build core-browser && pnpm build core-node
```

Expected: Success (comment-only changes never break builds, but verify).

**Step 5: Run tests**

```bash
pnpm vitest packages/core-common/tests/ packages/core-browser/tests/ packages/core-node/tests/ --run
```

Expected: All pass.

**Step 6: Commit**

```bash
git add packages/core-common/src/ packages/core-browser/src/ packages/core-node/src/
git commit -m "refactor: convert Korean comments to English in core-common, core-browser, core-node"
```

---

### Task 2: orm-common, orm-node

**Files (~40 source files):**
- `packages/orm-common/src/**/*.ts` (32 files)
- `packages/orm-node/src/**/*.ts` (8 files)

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/orm-common/src/ packages/orm-node/src/ --include='*.ts'
```

**Step 2: Translate all Korean comments to English**

No special exemptions in these packages.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/orm-common/src/ packages/orm-node/src/ --include='*.ts'
```
Expected: No matches.

**Step 4: Build**
```bash
pnpm build orm-common && pnpm build orm-node
```

**Step 5: Test**
```bash
pnpm vitest packages/orm-common/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/orm-common/src/ packages/orm-node/src/
git commit -m "refactor: convert Korean comments to English in orm-common, orm-node"
```

---

### Task 3: service-common, service-client, service-server

**Files (~28 source files):**
- `packages/service-common/src/**/*.ts` (5 files)
- `packages/service-client/src/**/*.ts` (10 files)
- `packages/service-server/src/**/*.ts` (13 files)

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/service-common/src/ packages/service-client/src/ packages/service-server/src/ --include='*.ts'
```

**Step 2: Translate all Korean comments to English**

No special exemptions.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/service-common/src/ packages/service-client/src/ packages/service-server/src/ --include='*.ts'
```
Expected: No matches.

**Step 4: Build**
```bash
pnpm build service-common && pnpm build service-client && pnpm build service-server
```

**Step 5: Test**
```bash
pnpm vitest packages/service-common/tests/ packages/service-server/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/service-common/src/ packages/service-client/src/ packages/service-server/src/
git commit -m "refactor: convert Korean comments to English in service-common, service-client, service-server"
```

---

### Task 4: solid — components

**Files (~80 source files):**
- `packages/solid/src/components/**/*.tsx` and `*.ts`

This is the largest batch. Process directory by directory:
1. `components/data/` (kanban, calendar, list, table, etc.)
2. `components/display/` (icon, badge, label, etc.)
3. `components/input/` (text input, select, checkbox, etc.)
4. `components/layout/` (sidebar, topbar, modal, etc.)

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/solid/src/components/ --include='*.ts' --include='*.tsx'
```

**Step 2: Translate all Korean comments to English**

No special exemptions in components.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/solid/src/components/ --include='*.ts' --include='*.tsx'
```
Expected: No matches.

**Step 4: Build**
```bash
pnpm build solid
```

**Step 5: Test**
```bash
pnpm vitest packages/solid/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/solid/src/components/
git commit -m "refactor: convert Korean comments to English in solid components"
```

---

### Task 5: solid — hooks, providers, utils, root

**Files (~35 source files):**
- `packages/solid/src/hooks/**/*.ts`
- `packages/solid/src/providers/**/*.ts` and `*.tsx`
- `packages/solid/src/utils/**/*.ts`
- `packages/solid/src/index.ts` and other root files

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/solid/src/ --include='*.ts' --include='*.tsx' | grep -v '/components/'
```

**Step 2: Translate all Korean comments to English**

Exemption: In `packages/solid/src/hooks/createIMEHandler.ts`, the comments about Korean IME composition should be translated to English, but any Korean string literals used in the IME logic should remain.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/solid/src/ --include='*.ts' --include='*.tsx' | grep -v '/components/'
```
Expected: No matches (or only exempted Korean in IME handler).

**Step 4: Build**
```bash
pnpm build solid
```

**Step 5: Test**
```bash
pnpm vitest packages/solid/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/solid/src/hooks/ packages/solid/src/providers/ packages/solid/src/utils/ packages/solid/src/index.ts
git commit -m "refactor: convert Korean comments to English in solid hooks, providers, utils"
```

---

### Task 6: solid-demo, solid-demo-server

**Files (~48 source files):**
- `packages/solid-demo/src/**/*.ts` and `*.tsx` (46 files)
- `packages/solid-demo-server/src/**/*.ts` (2 files)

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/solid-demo/src/ packages/solid-demo-server/src/ --include='*.ts' --include='*.tsx'
```

**Step 2: Translate all Korean comments to English**

Note: Demo UI text strings (e.g., `"제목"`, `"저장"`) are handled in Phase 2. This task only covers comments/JSDoc/regions.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/solid-demo/src/ packages/solid-demo-server/src/ --include='*.ts' --include='*.tsx'
```
Expected: Korean still present in string literals (handled in Phase 2). Verify no Korean remains in comments.

**Step 4: Build**
```bash
pnpm build solid-demo
```

**Step 5: Test** — solid-demo has no unit tests, skip.

**Step 6: Commit**
```bash
git add packages/solid-demo/src/ packages/solid-demo-server/src/
git commit -m "refactor: convert Korean comments to English in solid-demo, solid-demo-server"
```

---

### Task 7: sd-cli, sd-claude, lint

**Files (~58 source files):**
- `packages/sd-cli/src/**/*.ts` (50 files)
- `packages/sd-claude/src/**/*.ts` (2 files)
- `packages/lint/src/**/*.ts` (6 files)

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/sd-cli/src/ packages/sd-claude/src/ packages/lint/src/ --include='*.ts'
```

**Step 2: Translate all Korean comments to English**

No special exemptions.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/sd-cli/src/ packages/sd-claude/src/ packages/lint/src/ --include='*.ts'
```
Expected: Korean may remain in error/log message strings (handled in Phase 2). Verify no Korean in comments.

**Step 4: Build**
```bash
pnpm build sd-cli
```

**Step 5: Test**
```bash
pnpm vitest packages/sd-cli/tests/ packages/lint/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/sd-cli/src/ packages/sd-claude/src/ packages/lint/src/
git commit -m "refactor: convert Korean comments to English in sd-cli, sd-claude, lint"
```

---

### Task 8: excel, storage, capacitor-plugins

**Files (~38 source files):**
- `packages/excel/src/**/*.ts` (18 files)
- `packages/storage/src/**/*.ts` (3 files)
- `packages/capacitor-plugin-auto-update/src/**/*.ts` (3 files)
- `packages/capacitor-plugin-broadcast/src/**/*.ts` (3 files)
- `packages/capacitor-plugin-file-system/src/**/*.ts` (3 files)
- `packages/capacitor-plugin-usb-storage/src/**/*.ts` (2 files)

**Step 1: Scan**
```bash
grep -rn '[가-힣]' packages/excel/src/ packages/storage/src/ packages/capacitor-plugin-*/src/ --include='*.ts'
```

**Step 2: Translate all Korean comments to English**

Exemption: None for comments. Korean string literals in error messages handled in Phase 2.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/excel/src/ packages/storage/src/ packages/capacitor-plugin-*/src/ --include='*.ts'
```
Expected: Korean may remain in error/log/alert strings (Phase 2). Verify no Korean in comments.

**Step 4: Build**
```bash
pnpm build excel && pnpm build storage
```

**Step 5: Test**
```bash
pnpm vitest packages/excel/tests/ packages/storage/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/excel/src/ packages/storage/src/ packages/capacitor-plugin-*/src/
git commit -m "refactor: convert Korean comments to English in excel, storage, capacitor-plugins"
```

---

### Task 9: Phase 1 — tsconfig.json + full verification

**Files:**
- `tsconfig.json` (root — has Korean comments on lines 3, 24, 28, 35)

**Step 1: Translate Korean comments in tsconfig.json**

```jsonc
// Before
// 출력    → // Output
// 모듈    → // Modules
// 빌드    → // Build
// 경로    → // Paths
```

**Step 2: Full Phase 1 Korean scan**

```bash
grep -rn '[가-힣]' packages/*/src/ --include='*.ts' --include='*.tsx' | grep -v 'node_modules'
```

Verify remaining Korean is ONLY in:
- `packages/core-common/src/utils/str.ts` — Korean particle literals + mapping tables
- `packages/core-common/src/utils/date-format.ts` — Korean locale data (decision point)
- `packages/solid/src/components/data/calendar/Calendar.tsx` — Korean day names (decision point)
- String literals inside `throw`, `console`, `alert` (Phase 2)
- `packages/solid/src/hooks/createIMEHandler.ts` — Korean IME literals (if any)

**Step 3: Full build**
```bash
pnpm build
```
Expected: Success.

**Step 4: Full test**
```bash
pnpm vitest --run
```
Expected: All pass.

**Step 5: Commit tsconfig.json**
```bash
git add tsconfig.json
git commit -m "refactor: convert Korean comments to English in tsconfig.json"
```

---

## Phase 2 — Error / Log Messages

**Target:** `throw new Error(...)`, `console.log/warn/error(...)`, `alert(...)`
**Dependency:** Run after Phase 1 (comments already translated)
**Total:** ~75 unique files

### Task 10: core-*, orm-*, service-* error/log messages

**Files (~45 files with Korean error/log/alert strings):**
- `packages/core-common/src/**/*.ts`
- `packages/core-browser/src/**/*.ts`
- `packages/core-node/src/**/*.ts`
- `packages/orm-common/src/**/*.ts`
- `packages/orm-node/src/**/*.ts`
- `packages/service-common/src/**/*.ts`
- `packages/service-client/src/**/*.ts`
- `packages/service-server/src/**/*.ts`

**Step 1: Find Korean error messages**

```bash
grep -rn 'throw new Error\|console\.\(log\|warn\|error\)\|alert(' packages/core-common/src/ packages/core-browser/src/ packages/core-node/src/ packages/orm-common/src/ packages/orm-node/src/ packages/service-common/src/ packages/service-client/src/ packages/service-server/src/ --include='*.ts' | grep '[가-힣]'
```

**Step 2: Translate all Korean error/log messages to English**

For each file: read → find Korean strings in throw/console/alert → translate → edit.

Example translations:
```ts
// Before
throw new Error("안드로이드만 지원합니다.");
throw new Error("토큰이 만료되었습니다.");
throw new Error("로그인이 필요합니다.");
console.log("서버에서 최신버전 정보를 가져오지 못했습니다.");

// After
throw new Error("Only Android is supported.");
throw new Error("Token has expired.");
throw new Error("Authentication required.");
console.log("Failed to fetch latest version from server.");
```

For template literal error messages:
```ts
// Before
throw new Error(`시트명이 '${nameOrIndex}'인 시트를 찾을 수 없습니다.`);

// After
throw new Error(`Sheet '${nameOrIndex}' not found.`);
```

**Step 3: Verify**
```bash
grep -rn 'throw new Error\|console\.\(log\|warn\|error\)\|alert(' packages/core-common/src/ packages/core-browser/src/ packages/core-node/src/ packages/orm-common/src/ packages/orm-node/src/ packages/service-common/src/ packages/service-client/src/ packages/service-server/src/ --include='*.ts' | grep '[가-힣]'
```
Expected: No matches.

**Step 4: Build**
```bash
pnpm build core-common && pnpm build core-browser && pnpm build core-node && pnpm build orm-common && pnpm build orm-node && pnpm build service-common && pnpm build service-client && pnpm build service-server
```

**Step 5: Test**
```bash
pnpm vitest packages/core-common/tests/ packages/core-browser/tests/ packages/core-node/tests/ packages/orm-common/tests/ packages/service-common/tests/ packages/service-server/tests/ --run
```

Note: Some tests may fail if they assert on Korean error messages. This is expected — those tests will be updated in Phase 3.

**Step 6: Commit**
```bash
git add packages/core-common/src/ packages/core-browser/src/ packages/core-node/src/ packages/orm-common/src/ packages/orm-node/src/ packages/service-common/src/ packages/service-client/src/ packages/service-server/src/
git commit -m "refactor: convert Korean error and log messages to English in core, orm, service packages"
```

---

### Task 11: solid, solid-demo, sd-*, excel, storage, capacitor-* error/log messages

**Files (~30 files with Korean error/log/alert strings):**
- `packages/solid/src/**/*.ts` and `*.tsx`
- `packages/solid-demo/src/**/*.ts` and `*.tsx`
- `packages/solid-demo-server/src/**/*.ts`
- `packages/sd-cli/src/**/*.ts`
- `packages/sd-claude/src/**/*.ts`
- `packages/excel/src/**/*.ts`
- `packages/storage/src/**/*.ts`
- `packages/capacitor-plugin-*/src/**/*.ts`

**Step 1: Find Korean error/log/alert messages**

```bash
grep -rn 'throw new Error\|console\.\(log\|warn\|error\)\|alert(' packages/solid/src/ packages/solid-demo/src/ packages/solid-demo-server/src/ packages/sd-cli/src/ packages/sd-claude/src/ packages/excel/src/ packages/storage/src/ packages/capacitor-plugin-*/src/ --include='*.ts' --include='*.tsx' | grep '[가-힣]'
```

**Step 2: Translate all Korean error/log/alert messages to English**

Special note for solid-demo: demo UI alert messages like `alert("프로필")`, `alert("설정")`, `alert("로그아웃")` should be converted to English:
```ts
alert("Profile")
alert("Settings")
alert("Logout")
```

Also convert any Korean UI text strings in solid-demo that appear as user-facing text:
```ts
// Before
"제목", "저장", "비밀번호 변경", "회원가입"

// After
"Title", "Save", "Change Password", "Sign Up"
```

**Step 3: Verify**
```bash
grep -rn 'throw new Error\|console\.\(log\|warn\|error\)\|alert(' packages/solid/src/ packages/solid-demo/src/ packages/solid-demo-server/src/ packages/sd-cli/src/ packages/sd-claude/src/ packages/excel/src/ packages/storage/src/ packages/capacitor-plugin-*/src/ --include='*.ts' --include='*.tsx' | grep '[가-힣]'
```
Expected: No matches.

**Step 4: Build**
```bash
pnpm build solid && pnpm build solid-demo && pnpm build sd-cli && pnpm build excel && pnpm build storage
```

**Step 5: Test**
```bash
pnpm vitest packages/solid/tests/ packages/sd-cli/tests/ packages/excel/tests/ packages/storage/tests/ --run
```

**Step 6: Commit**
```bash
git add packages/solid/src/ packages/solid-demo/src/ packages/solid-demo-server/src/ packages/sd-cli/src/ packages/sd-claude/src/ packages/excel/src/ packages/storage/src/ packages/capacitor-plugin-*/src/
git commit -m "refactor: convert Korean error and log messages to English in solid, demo, tooling, library packages"
```

---

## Phase 3 — Test Descriptions

**Target:** `describe("...")`, `it("...")`, Korean strings in test assertions and test data (except functional Korean test data)
**Dependency:** Run after Phase 2 (error messages already translated — update matching assertions)
**Total:** ~190 test files

### Task 12: core-common, core-browser, core-node tests

**Files (~32 test files):**
- `packages/core-common/tests/**/*.spec.ts` (25 files)
- `packages/core-browser/tests/**/*.spec.ts` (3 files)
- `packages/core-node/tests/**/*.spec.ts` (4 files)

**Step 1: Find Korean test text**

```bash
grep -rn '[가-힣]' packages/core-common/tests/ packages/core-browser/tests/ packages/core-node/tests/ --include='*.spec.ts'
```

**Step 2: Translate test descriptions and assertions to English**

Translate `describe()` and `it()` labels:
```ts
// Before
describe("Array.prototype 확장", () => {
  describe("기본 체이닝", () => {
    it("요소를 첫 번째 자식으로 삽입", () => {

// After
describe("Array.prototype extensions", () => {
  describe("basic chaining", () => {
    it("insert element as first child", () => {
```

Update error message assertions to match Phase 2 English translations:
```ts
// Before
expect(() => ...).toThrow("유효하지 않은...");

// After
expect(() => ...).toThrow("Invalid...");
```

Exemption: Korean encoding test data (e.g., `"한글 내용"` in zip tests) must remain Korean.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/core-common/tests/ packages/core-browser/tests/ packages/core-node/tests/ --include='*.spec.ts'
```
Expected: Only exempted Korean encoding test data.

**Step 4: Test**
```bash
pnpm vitest packages/core-common/tests/ packages/core-browser/tests/ packages/core-node/tests/ --run
```
Expected: All pass.

**Step 5: Commit**
```bash
git add packages/core-common/tests/ packages/core-browser/tests/ packages/core-node/tests/
git commit -m "refactor: convert Korean test descriptions to English in core-common, core-browser, core-node"
```

---

### Task 13: orm-common tests + integration tests

**Files (~47 test files):**
- `packages/orm-common/tests/**/*.spec.ts` (38 files)
- `tests/orm/src/**/*.spec.ts` (9 files)

**Step 1: Find Korean test text**

```bash
grep -rn '[가-힣]' packages/orm-common/tests/ tests/orm/src/ --include='*.spec.ts'
```

**Step 2: Translate test descriptions and assertions to English**

Same approach as Task 12. Update error message assertions to match Phase 2 translations.

Note: Integration tests in `tests/orm/` require Docker DB to run. Translate descriptions but note that full integration test verification requires Docker setup.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/orm-common/tests/ tests/orm/src/ --include='*.spec.ts'
```
Expected: No matches.

**Step 4: Test (unit tests only)**
```bash
pnpm vitest packages/orm-common/tests/ --run
```
Expected: All pass. (Integration tests skipped — require Docker.)

**Step 5: Commit**
```bash
git add packages/orm-common/tests/ tests/orm/src/
git commit -m "refactor: convert Korean test descriptions to English in orm-common, orm integration tests"
```

---

### Task 14: solid tests

**Files (~74 test files):**
- `packages/solid/tests/**/*.spec.tsx` and `*.spec.ts`

This is the largest test batch. Process systematically by subdirectory:
1. `tests/components/data/` (kanban, calendar, list, table, etc.)
2. `tests/components/display/`
3. `tests/components/input/`
4. `tests/components/layout/`
5. `tests/hooks/`
6. `tests/utils/`

**Step 1: Find Korean test text**

```bash
grep -rn '[가-힣]' packages/solid/tests/ --include='*.spec.ts' --include='*.spec.tsx'
```

**Step 2: Translate test descriptions and assertions to English**

Same approach. Pay attention to:
- Long `describe` labels that describe component behavior
- `it` labels that describe user interactions (e.g., `"Shift+Click하면 선택 해제된다"` → `"deselects on Shift+Click"`)
- Test data strings that are not functional Korean data

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/solid/tests/ --include='*.spec.ts' --include='*.spec.tsx'
```
Expected: No matches.

**Step 4: Test**
```bash
pnpm vitest packages/solid/tests/ --run
```
Expected: All pass.

**Step 5: Commit**
```bash
git add packages/solid/tests/
git commit -m "refactor: convert Korean test descriptions to English in solid tests"
```

---

### Task 15: remaining tests (sd-cli, excel, lint, storage, service, solid-demo)

**Files (~37 test files):**
- `packages/sd-cli/tests/**/*.spec.ts` (18 files)
- `packages/excel/tests/**/*.spec.ts` (8 files)
- `packages/lint/tests/**/*.spec.ts` (4 files)
- `packages/storage/tests/**/*.spec.ts` (3 files)
- `packages/service-common/tests/**/*.spec.ts` (2 files)
- `packages/service-server/tests/**/*.spec.ts` (1 file)
- `tests/service/src/**/*.spec.ts` (1 file)

**Step 1: Find Korean test text**

```bash
grep -rn '[가-힣]' packages/sd-cli/tests/ packages/excel/tests/ packages/lint/tests/ packages/storage/tests/ packages/service-common/tests/ packages/service-server/tests/ tests/service/src/ --include='*.spec.ts'
```

**Step 2: Translate test descriptions and assertions to English**

Exemption: In `packages/excel/tests/excel-wrapper.spec.ts`, Zod `.describe()` Korean values (e.g., `.describe("이름")`) should be translated:
```ts
// Before
name: z.string().describe("이름"),
age: z.number().describe("나이"),

// After
name: z.string().describe("name"),
age: z.number().describe("age"),
```

But Korean test data used to verify Korean encoding (e.g., Korean strings written to Excel and read back) must remain.

**Step 3: Verify**
```bash
grep -rn '[가-힣]' packages/sd-cli/tests/ packages/excel/tests/ packages/lint/tests/ packages/storage/tests/ packages/service-common/tests/ packages/service-server/tests/ tests/service/src/ --include='*.spec.ts'
```
Expected: Only exempted Korean encoding test data.

**Step 4: Test**
```bash
pnpm vitest packages/sd-cli/tests/ packages/excel/tests/ packages/lint/tests/ packages/storage/tests/ packages/service-common/tests/ packages/service-server/tests/ --run
```
Expected: All pass.

**Step 5: Commit**
```bash
git add packages/sd-cli/tests/ packages/excel/tests/ packages/lint/tests/ packages/storage/tests/ packages/service-common/tests/ packages/service-server/tests/ tests/service/src/
git commit -m "refactor: convert Korean test descriptions to English in sd-cli, excel, lint, storage, service tests"
```

---

### Task 16: Phase 3 — full verification

**Step 1: Scan all test files for remaining Korean**

```bash
grep -rn '[가-힣]' packages/*/tests/ tests/ --include='*.spec.ts' --include='*.spec.tsx'
```

Verify remaining Korean is ONLY in exempted locations (Korean encoding test data).

**Step 2: Full test run**

```bash
pnpm vitest --run
```
Expected: All pass.

**Step 3: Commit (if any fixes needed)**

If verification found issues, fix and commit:
```bash
git commit -m "fix: resolve remaining Korean text in test files"
```

---

## Phase 4 — Metadata / Config

**Target:** `package.json` (description, author), YAML comments, Zod `.describe()` in source
**Total:** ~25 files

### Task 17: All metadata and config files

**Files:**
- Root: `package.json`
- 20 packages: `packages/*/package.json`
- Integration tests: `tests/orm/package.json`, `tests/service/package.json`
- YAML: `.prettierrc.yaml`, `tests/orm/docker-compose.test.yml`

**Step 1: Update all package.json files**

For each `package.json`:
- Change `"author": "김석래"` → `"author": "simplysm"`
- Translate `"description"` to English

```json
// Root package.json
"description": "Simplysm full-stack TypeScript framework"
"author": "simplysm"

// Package examples
"description": "Simplysm core module (common)"        // core-common
"description": "Simplysm core module (browser)"       // core-browser
"description": "Simplysm core module (node)"           // core-node
"description": "Simplysm ORM module (common)"          // orm-common
"description": "Simplysm ORM module (node)"            // orm-node
"description": "Simplysm service module (common)"      // service-common
"description": "Simplysm service module (client)"      // service-client
"description": "Simplysm service module (server)"      // service-server
"description": "Simplysm SolidJS UI library"           // solid
"description": "Simplysm SolidJS demo app"             // solid-demo
"description": "Simplysm SolidJS demo server"          // solid-demo-server
"description": "Simplysm CLI tool"                     // sd-cli
"description": "Simplysm Excel processing library"     // excel
"description": "Simplysm storage module (node)"        // storage
"description": "Simplysm ESLint/Stylelint config"      // lint
"description": "Simplysm ORM integration tests"        // tests/orm
"description": "Simplysm service integration tests"    // tests/service
// capacitor-plugins: keep existing English or translate if Korean
```

Note: `sd-claude` already has English description — leave as-is.

**Step 2: Update .prettierrc.yaml comments**

```yaml
# Before
printWidth: 100 # 한 줄 최대 길이
tabWidth: 2 # 탭 너비 (Angular, JS, TS 모두 2칸 권장)

# After
printWidth: 100 # Max line length
tabWidth: 2 # Tab width (2 spaces for Angular, JS, TS)
```

Translate all Korean inline comments.

**Step 3: Update docker-compose.test.yml comments**

```yaml
# Before
# 통합 테스트용 DB 컨테이너
# 사용법:

# After
# DB containers for integration tests
# Usage:
```

**Step 4: Update tsconfig.json comments** (if not already done in Task 9)

Skip if already done.

**Step 5: Verify**

```bash
grep -rn '[가-힣]' package.json packages/*/package.json tests/*/package.json .prettierrc.yaml tests/orm/docker-compose.test.yml tsconfig.json
```
Expected: No matches.

**Step 6: Build**
```bash
pnpm build
```

**Step 7: Commit**
```bash
git add package.json packages/*/package.json tests/*/package.json .prettierrc.yaml tests/orm/docker-compose.test.yml
git commit -m "refactor: convert Korean metadata and config to English"
```

---

## Phase 5 — Function Name Clarification

**Target:** Korean utility function naming that doesn't clearly indicate Korean language processing
**Dependency:** Run last (renames affect exports/imports/call sites across the codebase)

### Task 18: Rename strGetSuffix and handle Korean data constants

**Files:**
- Definition: `packages/core-common/src/utils/str.ts`
- Export: `packages/core-common/src/index.ts`
- Tests: `packages/core-common/tests/utils/string.spec.ts`

**Step 1: Rename `strGetSuffix` → `koreanGetSuffix`**

In `packages/core-common/src/utils/str.ts`:
```ts
// Before
export function strGetSuffix(

// After
export function koreanGetSuffix(
```

**Step 2: Update export in index.ts**

In `packages/core-common/src/index.ts`:
```ts
// Update the export if explicitly named
```

**Step 3: Search for all call sites**

```bash
grep -rn 'strGetSuffix' packages/ tests/ --include='*.ts' --include='*.tsx'
```

Update every occurrence to `koreanGetSuffix`.

**Step 4: Update tests**

In `packages/core-common/tests/utils/string.spec.ts`:
```ts
// Before
strGetSuffix(...)

// After
koreanGetSuffix(...)
```

**Step 5: Handle Korean locale data constants (DECISION POINT)**

Ask the user about these Korean runtime constants:
1. `packages/core-common/src/utils/date-format.ts` — `weekStrings`, `"오전"/"오후"`
2. `packages/solid/src/components/data/calendar/Calendar.tsx` — `WEEKS`

Options:
- **A) Convert to English** (`["Sun", "Mon", ...]`, `"AM"/"PM"`)
- **B) Keep as Korean** (runtime behavior preserved)
- **C) Make locale-configurable** (most work, best long-term)

If the user chooses A, update the arrays and fix any affected tests.

**Step 6: Verify**

```bash
grep -rn 'strGetSuffix' packages/ tests/ --include='*.ts' --include='*.tsx'
```
Expected: No matches.

**Step 7: Build + test**
```bash
pnpm build && pnpm vitest --run
```

**Step 8: Commit**
```bash
git add -A
git commit -m "refactor: rename Korean utility functions for clarity (strGetSuffix → koreanGetSuffix)"
```

---

## Final Verification

### Task 19: Comprehensive Korean scan and final verification

**Step 1: Full Korean scan across all source files**

```bash
grep -rn '[가-힣]' packages/*/src/ packages/*/tests/ tests/ --include='*.ts' --include='*.tsx' | grep -v node_modules
```

**Step 2: Categorize any remaining Korean**

For each match, verify it falls into one of these exempted categories:
- Korean particle literals in `koreanGetSuffix` (`"을"`, `"는"`, etc.)
- Korean character mapping tables (Choseong/Jungseong/Jongseong)
- Korean encoding test data (zip/excel Korean content tests)
- Korean locale data (if user chose to keep in Phase 5)

If any non-exempted Korean is found, fix it.

**Step 3: Scan config/metadata files**

```bash
grep -rn '[가-힣]' package.json packages/*/package.json tests/*/package.json .prettierrc.yaml tsconfig.json tests/orm/docker-compose.test.yml
```
Expected: No matches.

**Step 4: Full build**

```bash
pnpm build
```
Expected: Success.

**Step 5: Full test suite**

```bash
pnpm vitest --run
```
Expected: All pass.

**Step 6: Commit (if any fixes)**

```bash
git commit -m "fix: resolve remaining Korean text found in final verification"
```

---

## Summary

| Phase | Tasks | Files | Commit Message |
|-------|-------|-------|----------------|
| 1. Comments/JSDoc | 1–9 | ~367 source + tsconfig | `refactor: convert Korean comments to English in ...` |
| 2. Error/Log | 10–11 | ~75 source | `refactor: convert Korean error and log messages to English in ...` |
| 3. Tests | 12–16 | ~190 test | `refactor: convert Korean test descriptions to English in ...` |
| 4. Metadata | 17 | ~25 config | `refactor: convert Korean metadata and config to English` |
| 5. Naming | 18 | ~3 source + all call sites | `refactor: rename Korean utility functions for clarity` |
| Final | 19 | — | `fix: resolve remaining Korean text` (if needed) |

**Total: 19 tasks**

### Dependency Order

```
Phase 1 (Tasks 1-9) → independent, can run in parallel within phase
    ↓ commit all
Phase 2 (Tasks 10-11) → depends on Phase 1 complete
    ↓ commit all
Phase 3 (Tasks 12-16) → depends on Phase 2 (error message assertions)
    ↓ commit all
Phase 4 (Task 17) → independent of Phases 2-3
    ↓ commit
Phase 5 (Task 18) → run last (renames affect all call sites)
    ↓ commit
Final Verification (Task 19)
```
