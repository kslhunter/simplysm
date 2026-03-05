# Excel API Name Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename 10 public API methods in `packages/excel` to align with industry standards.

**Architecture:** Pure mechanical rename — no logic or signature changes. All renames are applied across source, tests, and docs.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Rename ExcelUtils parse methods

**Files:**
- Modify: `packages/excel/src/utils/excel-utils.ts`
- Modify: `packages/excel/src/xml/excel-xml-worksheet.ts`
- Test: `packages/excel/tests/utils/excel-utils.spec.ts`

**Step 1: Rename methods in excel-utils.ts**

In `packages/excel/src/utils/excel-utils.ts`, apply these renames (including internal cross-references):
- `parseRowAddrCode` → `parseRowAddr` (definition + parameter `addrCode` → `addr`)
- `parseColAddrCode` → `parseColAddr` (definition + parameter `addrCode` → `addr`)
- `parseCellAddrCode` → `parseCellAddr` (definition + internal calls to `parseRowAddr`/`parseColAddr`)
- `parseRangeAddrCode` → `parseRangeAddr` (definition + internal calls to `parseCellAddr`)

**Step 2: Update internal callers in excel-xml-worksheet.ts**

In `packages/excel/src/xml/excel-xml-worksheet.ts`, replace all calls:
- `ExcelUtils.parseRowAddrCode(` → `ExcelUtils.parseRowAddr(`
- `ExcelUtils.parseColAddrCode(` → `ExcelUtils.parseColAddr(`
- `ExcelUtils.parseCellAddrCode(` → `ExcelUtils.parseCellAddr(`
- `ExcelUtils.parseRangeAddrCode(` → `ExcelUtils.parseRangeAddr(`

**Step 3: Update test file**

In `packages/excel/tests/utils/excel-utils.spec.ts`, replace all occurrences:
- `parseColAddrCode` → `parseColAddr`
- `parseRowAddrCode` → `parseRowAddr`
- `parseCellAddrCode` → `parseCellAddr`
- `parseRangeAddrCode` → `parseRangeAddr`

**Step 4: Run tests**

Run: `pnpm -F @simplysm/excel exec vitest run tests/utils/excel-utils.spec.ts`
Expected: all PASS

---

### Task 2: Rename ExcelWorkbook methods

**Files:**
- Modify: `packages/excel/src/excel-workbook.ts`
- Test: `packages/excel/tests/excel-workbook.spec.ts`

**Step 1: Rename methods in excel-workbook.ts**

- `createWorksheet` → `addWorksheet` (method definition + JSDoc)
- `getBytes` → `toBytes` (method definition + JSDoc)
- `getBlob` → `toBlob` (method definition + JSDoc)

**Step 2: Update test file**

In `packages/excel/tests/excel-workbook.spec.ts`, replace all occurrences:
- `createWorksheet` → `addWorksheet`
- `.getBytes()` → `.toBytes()`
- `.getBlob()` → `.toBlob()`
- `.getVal()` → `.getValue()` (also used in this test file)
- `.setVal(` → `.setValue(`

**Step 3: Run tests**

Run: `pnpm -F @simplysm/excel exec vitest run tests/excel-workbook.spec.ts`
Expected: all PASS

---

### Task 3: Rename ExcelCell and ExcelWorksheet methods

**Files:**
- Modify: `packages/excel/src/excel-cell.ts`
- Modify: `packages/excel/src/excel-worksheet.ts`
- Modify: `packages/excel/src/xml/excel-xml-worksheet.ts`
- Test: `packages/excel/tests/excel-cell.spec.ts`
- Test: `packages/excel/tests/excel-worksheet.spec.ts`

**Step 1: Rename in excel-cell.ts**

- `setVal` → `setValue` (method definition + JSDoc)
- `getVal` → `getValue` (method definition + JSDoc)

**Step 2: Rename in excel-worksheet.ts**

- `setFix` → `freezeAt` (method definition + JSDoc)
- `wsXml.setFix(point)` → `wsXml.freezeAt(point)` (call site at line 255)
- `.getVal()` → `.getValue()` (call sites at lines 175, 186, 194)
- `.setVal(` → `.setValue(` (call sites at lines 210, 226, 231)

**Step 3: Rename in excel-xml-worksheet.ts**

- `setFix` → `freezeAt` (method definition at line 327)

**Step 4: Update test files**

In `packages/excel/tests/excel-cell.spec.ts`:
- `createWorksheet` → `addWorksheet`
- `.setVal(` → `.setValue(`
- `.getVal()` → `.getValue()`
- `.getBytes()` → `.toBytes()`

In `packages/excel/tests/excel-worksheet.spec.ts`:
- `createWorksheet` → `addWorksheet`
- `.setVal(` → `.setValue(`
- `.getVal()` → `.getValue()`
- `.getBytes()` → `.toBytes()`

**Step 5: Run tests**

Run: `pnpm -F @simplysm/excel exec vitest run tests/excel-cell.spec.ts tests/excel-worksheet.spec.ts`
Expected: all PASS

---

### Task 4: Update remaining test files and ExcelWrapper

**Files:**
- Modify: `packages/excel/src/excel-wrapper.ts`
- Test: `packages/excel/tests/excel-wrapper.spec.ts`
- Test: `packages/excel/tests/excel-row.spec.ts`
- Test: `packages/excel/tests/excel-col.spec.ts`
- Test: `packages/excel/tests/image-insert.spec.ts`

**Step 1: Update excel-wrapper.ts**

- `wb.createWorksheet(wsName)` → `wb.addWorksheet(wsName)` (line 110)
- `.setVal(` → `.setValue(` (lines 118, 126)
- `ws.setFix(` → `ws.freezeAt(` (line 154)
- JSDoc comment: `wb.getBytes()` → `wb.toBytes()` (line 101)

**Step 2: Update remaining test files**

In each of these test files, apply all applicable renames:
- `excel-wrapper.spec.ts`: `getBytes` → `toBytes`, `getVal` → `getValue`, `setVal` → `setValue`
- `excel-row.spec.ts`: `createWorksheet` → `addWorksheet`, `setVal` → `setValue`, `getVal` → `getValue`
- `excel-col.spec.ts`: `createWorksheet` → `addWorksheet`, `setVal` → `setValue`, `getVal` → `getValue`, `getBytes` → `toBytes`
- `image-insert.spec.ts`: `createWorksheet` → `addWorksheet`, `getBytes` → `toBytes`

**Step 3: Run all tests**

Run: `pnpm -F @simplysm/excel exec vitest run`
Expected: all PASS

---

### Task 5: Update documentation

**Files:**
- Modify: `packages/excel/docs/workbook.md`
- Modify: `packages/excel/docs/utils.md`
- Modify: `packages/excel/docs/wrapper.md`

**Step 1: Update workbook.md**

Apply all renames in examples and method tables:
- `createWorksheet` → `addWorksheet`
- `getBytes` → `toBytes`
- `getBlob` → `toBlob`
- `setFix` → `freezeAt`
- `setVal` → `setValue`
- `getVal` → `getValue`

**Step 2: Update utils.md**

- `parseRowAddrCode` → `parseRowAddr`
- `parseColAddrCode` → `parseColAddr`
- `parseCellAddrCode` → `parseCellAddr`
- `parseRangeAddrCode` → `parseRangeAddr`

**Step 3: Update wrapper.md**

- `getBytes` → `toBytes`
