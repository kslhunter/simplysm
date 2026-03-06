# Excel Package Review Fixes

## Overview

Fix 3 issues found during code review of `packages/excel`.

## Finding 1: [CRITICAL] `insertCopyRow` merge cell shift is dead code

### Problem

`ExcelWorksheet.insertCopyRow()` (lines 113-117) attempts to shift merge cells by mutating objects returned from `getMergeCells()`. However, `getMergeCells()` returns freshly parsed objects via `ExcelUtils.parseRangeAddr()` — mutations affect only transient objects, NOT the original XML data (`item.$.ref` strings). Merge cells are not shifted when inserting rows.

Additionally, the subsequent `copyRow()` loop handles merge cells per-row, which would conflict with a working shift implementation for multi-row merges (double-shifting).

### Solution

**Approach: `skipMerge` option on `ExcelXmlWorksheet.copyRow()`**

1. **Add `ExcelXmlWorksheet.shiftMergeCells(fromRow, delta)`**: Directly iterate `this.data.worksheet.mergeCells[0].mergeCell`, parse each `ref`, shift `s.r`/`e.r` if `>= fromRow`, write back via `ExcelUtils.stringifyRangeAddr()`.

2. **Add `skipMerge` option to `ExcelXmlWorksheet.copyRow()`**: `copyRow(sourceR, targetR, options?: { skipMerge?: boolean })`. When `skipMerge` is true, skip merge cell handling (lines 380-398).

3. **Fix `ExcelWorksheet.insertCopyRow()`**:
   - Remove dead code (lines 113-117)
   - Call `wsData.shiftMergeCells(targetR, 1)` — shift merge cells in XML
   - Row shift loop: call `wsData.copyRow(r, r + 1, { skipMerge: true })` directly (bypass public wrapper)
   - Final copy: call `wsData.copyRow(adjustedSrcR, targetR)` (with merge handling)

4. **Add tests**: Merge cell scenarios for `insertCopyRow` in `tests/excel-worksheet.spec.ts`.

### Files

- `src/xml/excel-xml-worksheet.ts` — add `shiftMergeCells()`, extend `copyRow()` signature
- `src/excel-worksheet.ts` — fix `insertCopyRow()`
- `tests/excel-worksheet.spec.ts` — add merge cell test cases

## Finding 3: [WARNING] `background` color format contradictory documentation

### Problem

Three locations describe the background color format differently:
- `excel-cell.ts:230` JSDoc: `"FFFF0000"` (standard ARGB, FF=opaque)
- `types.ts:373`: `"00FF0000"` (reversed alpha, 00=opaque)
- `excel-cell.ts:241` error message: `"alpha(reversed)+rgb"`

Actual codebase uses reversed alpha (`00` = opaque), confirmed by border color `"00000000"` = opaque black.

### Solution

Fix `excel-cell.ts:230` JSDoc example from `"FFFF0000"` to `"00FF0000"`.

### Files

- `src/excel-cell.ts` — fix JSDoc example

## Finding 6: [WARNING] `as ExcelCellType | undefined` type narrowing without runtime check

### Problem

`ExcelCellData.$.t` is typed as `string | undefined` (`types.ts:146`), but `getCellType()` casts it to `ExcelCellType | undefined` without validation. Since this field only ever holds `ExcelCellType` values, the interface type should be narrowed.

### Solution

Change `t?: string` to `t?: ExcelCellType` in `ExcelCellData` interface. Remove the `as ExcelCellType | undefined` cast in `getCellType()`.

### Files

- `src/types.ts` — change `t` field type
- `src/xml/excel-xml-worksheet.ts` — remove cast
