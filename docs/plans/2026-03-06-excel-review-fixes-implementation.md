# Excel Package Review Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 3 code review findings in the excel package: merge cell shift bug in `insertCopyRow`, contradictory documentation for background color format, and unsafe type cast in `getCellType()`.

**Architecture:**
- Task 1 adds `shiftMergeCells()` method to `ExcelXmlWorksheet` to directly modify XML merge cell refs.
- Task 2 extends `copyRow()` with optional `skipMerge` parameter to prevent double-shifting.
- Task 3 fixes `insertCopyRow()` to use new methods and adds test cases for merge cells.
- Task 4 fixes documentation in JSDoc comment.
- Task 5 narrows type of `ExcelCellData.$.t` from `string` to `ExcelCellType`.

**Tech Stack:** TypeScript, vitest (unit tests), XML via xml2js, Excel ZIP archive format.

---

## Task 1: Add `shiftMergeCells()` to ExcelXmlWorksheet

**Files:**
- Modify: `packages/excel/src/xml/excel-xml-worksheet.ts:199-222`
- Test: `packages/excel/tests/excel-worksheet.spec.ts`

**Context:**
Merge cells in Excel are stored in `this.data.worksheet.mergeCells[0].mergeCell` as an array. Each element has `$.ref` (string like "A1:B3"). When inserting a row, all merge cells at or below the target row must have their row indices shifted. Currently, code attempts to mutate transient objects returned by `getMergeCells()`, which has no effect.

**Step 1: Write the failing test**

```typescript
it("should shift merge cells when inserting row", async () => {
  const wb = new ExcelWorkbook();
  const ws = await wb.addWorksheet("Test");

  // Create merged cells: A1:B2 and C3:D4
  await ws.cell(0, 0).merge(1, 1); // A1:B2
  await ws.cell(2, 2).merge(3, 3); // C3:D4

  const wsData = await ws["_getWsData"](); // Access private method for testing
  wsData.shiftMergeCells(2, 1); // Shift rows >= 2 by +1

  const merges = wsData.getMergeCells();
  expect(merges).toEqual([
    { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }, // unchanged
    { s: { r: 3, c: 2 }, e: { r: 4, c: 3 } }, // shifted down by 1
  ]);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "shift merge cells" --run
```

Expected: `FAIL — Property 'shiftMergeCells' does not exist`

**Step 3: Write the shiftMergeCells method**

Add to `packages/excel/src/xml/excel-xml-worksheet.ts` after `removeMergeCells()` method (after line 222):

```typescript
  shiftMergeCells(fromRow: number, delta: number): void {
    const mergeCells = this.data.worksheet.mergeCells;
    if (mergeCells === undefined) return;

    for (const mergeCell of mergeCells[0].mergeCell) {
      const range = ExcelUtils.parseRangeAddr(mergeCell.$.ref);

      if (range.s.r >= fromRow) {
        range.s.r += delta;
      }
      if (range.e.r >= fromRow) {
        range.e.r += delta;
      }

      mergeCell.$.ref = ExcelUtils.stringifyRangeAddr(range);
    }
  }
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "shift merge cells" --run
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add packages/excel/src/xml/excel-xml-worksheet.ts packages/excel/tests/excel-worksheet.spec.ts
git commit -m "feat(excel): add shiftMergeCells to ExcelXmlWorksheet"
```

---

## Task 2: Extend copyRow with skipMerge option

**Files:**
- Modify: `packages/excel/src/xml/excel-xml-worksheet.ts:356-399`

**Context:**
The `copyRow()` method currently always handles merge cells (lines 380-398). When `insertCopyRow()` shifts merge cells first, then calls `copyRow()` in a loop, the per-row merge handling would conflict and cause double-shifting. Add an optional `skipMerge` flag to prevent this.

**Step 1: Write the failing test**

```typescript
it("should skip merge handling when skipMerge is true", async () => {
  const wb = new ExcelWorkbook();
  const ws = await wb.addWorksheet("Test");

  await ws.cell(0, 0).setValue("Row0");
  await ws.cell(1, 0).setValue("Row1");
  await ws.cell(0, 0).merge(0, 1); // Merge A1:B1

  const wsData = await ws["_getWsData"]();

  // Copy row 0 to row 1, but skip merge handling
  wsData.copyRow(0, 1, { skipMerge: true });

  // Row 1 should have the data but merge should not be copied
  const merges = wsData.getMergeCells();
  expect(merges).toEqual([
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // original merge, unchanged
  ]);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "skip merge handling" --run
```

Expected: `FAIL — Argument of type '{ skipMerge: true }' is not assignable to parameter of type 'undefined'`

**Step 3: Modify copyRow signature and implementation**

In `packages/excel/src/xml/excel-xml-worksheet.ts`, modify `copyRow()` method signature at line 356:

```typescript
  copyRow(sourceR: number, targetR: number, options?: { skipMerge?: boolean }): void {
    // Clone source ROW data
    const sourceRowInfo = this._dataMap.get(sourceR);

    if (sourceRowInfo != null) {
      // Clone rowData
      const newRowData: ExcelRowData = obj.clone(sourceRowInfo.data);

      // Update ROW address
      newRowData.$.r = ExcelUtils.stringifyRowAddr(targetR);

      // Update each CELL address
      if (newRowData.c != null) {
        for (const cellData of newRowData.c) {
          const colAddr = ExcelUtils.parseColAddr(cellData.$.r);
          cellData.$.r = ExcelUtils.stringifyAddr({ r: targetR, c: colAddr });
        }
      }

      this._replaceRowData(targetR, newRowData);
    } else {
      this._deleteRow(targetR);
    }

    // Skip merge handling if skipMerge option is true
    if (options?.skipMerge === true) {
      return;
    }

    // Copy and store source row merge cell info first
    const sourceMergeCells = this.getMergeCells()
      .filter((mc) => mc.s.r <= sourceR && mc.e.r >= sourceR)
      .map((mc) => ({ s: { ...mc.s }, e: { ...mc.e } }));

    // Remove existing merge cells in target row
    for (const mergeCell of this.getMergeCells()) {
      if (mergeCell.s.r <= targetR && mergeCell.e.r >= targetR) {
        this.removeMergeCells(mergeCell.s, mergeCell.e);
      }
    }

    // Copy stored source merge info to target
    for (const mergeCell of sourceMergeCells) {
      const rowDiff = targetR - sourceR;
      const newStartAddr = { r: mergeCell.s.r + rowDiff, c: mergeCell.s.c };
      const newEndAddr = { r: mergeCell.e.r + rowDiff, c: mergeCell.e.c };
      this.setMergeCells(newStartAddr, newEndAddr);
    }
  }
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "skip merge handling" --run
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add packages/excel/src/xml/excel-xml-worksheet.ts packages/excel/tests/excel-worksheet.spec.ts
git commit -m "feat(excel): add skipMerge option to copyRow"
```

---

## Task 3: Fix insertCopyRow to use new methods

**Files:**
- Modify: `packages/excel/src/excel-worksheet.ts:108-127`
- Test: `packages/excel/tests/excel-worksheet.spec.ts`

**Context:**
The current implementation has dead code (lines 113-117) that doesn't affect XML. Replace with proper merge cell shifting, and use the new `skipMerge` option in the loop.

**Step 1: Write the failing test**

```typescript
it("should shift merge cells when inserting row with merges", async () => {
  const wb = new ExcelWorkbook();
  const ws = await wb.addWorksheet("Test");

  await ws.cell(0, 0).setValue("Row0");
  await ws.cell(1, 0).setValue("Row1");
  await ws.cell(2, 0).setValue("Row2");

  // Create merge A1:B2 (rows 0-1)
  await ws.cell(0, 0).merge(1, 1);

  // Insert copy of row 0 at position 1
  await ws.insertCopyRow(0, 1);

  // Check that merge was shifted correctly
  const wsData = await ws["_getWsData"]();
  const merges = wsData.getMergeCells();

  // Original merge A1:B2 should shift to A2:B3
  expect(merges).toEqual([
    { s: { r: 0, c: 0 }, e: { r: 2, c: 1 } }, // A1:B3 (extended because we copied row 0 to row 1)
  ]);

  expect(await ws.cell(0, 0).getValue()).toBe("Row0");
  expect(await ws.cell(1, 0).getValue()).toBe("Row0"); // copied
  expect(await ws.cell(2, 0).getValue()).toBe("Row1"); // shifted
  expect(await ws.cell(3, 0).getValue()).toBe("Row2"); // shifted
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "shift merge cells when inserting row" --run
```

Expected: `FAIL — merge assertions fail (merge not shifted)`

**Step 3: Fix insertCopyRow implementation**

In `packages/excel/src/excel-worksheet.ts`, replace the entire `insertCopyRow()` method (lines 108-127):

```typescript
  /**
   * Insert-copy the source row at the target position.
   * Existing rows at and below the target are shifted down by one.
   * @param srcR Source row index to copy (0-based)
   * @param targetR Target row index to insert at (0-based)
   */
  async insertCopyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    const range = wsData.range;

    // Shift merge cells at or below targetR down by 1
    wsData.shiftMergeCells(targetR, 1);

    // When srcR >= targetR, adjust for the shifted position of srcR
    const adjustedSrcR = srcR >= targetR ? srcR + 1 : srcR;

    // Shift existing rows down (from bottom to top to avoid overwriting)
    // Use skipMerge: true because merge cells are already shifted above
    for (let r = range.e.r; r >= targetR; r--) {
      wsData.copyRow(r, r + 1, { skipMerge: true });
    }

    // Copy source row to target position (includes merge handling)
    wsData.copyRow(adjustedSrcR, targetR);
  }
```

**Step 4: Run test to verify it passes**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "shift merge cells when inserting row" --run
```

Expected: `PASS`

**Step 5: Add additional merge test cases**

Add to `tests/excel-worksheet.spec.ts` after the main insertCopyRow test:

```typescript
it("should handle multi-row merge when inserting row", async () => {
  const wb = new ExcelWorkbook();
  const ws = await wb.addWorksheet("Test");

  await ws.cell(0, 0).setValue("Row0");
  await ws.cell(1, 0).setValue("Row1");
  await ws.cell(2, 0).setValue("Row2");
  await ws.cell(3, 0).setValue("Row3");

  // Create merge A2:B4 (rows 1-3)
  await ws.cell(1, 0).merge(3, 1);

  // Insert copy of row 0 at position 2
  await ws.insertCopyRow(0, 2);

  const wsData = await ws["_getWsData"]();
  const merges = wsData.getMergeCells();

  // Merge should shift from A2:B4 to A2:B5
  expect(merges).toHaveLength(1);
  expect(merges[0].s).toEqual({ r: 1, c: 0 });
  expect(merges[0].e).toEqual({ r: 4, c: 1 }); // e.r shifted from 3 to 4
});

it("should not shift merge above insertion point", async () => {
  const wb = new ExcelWorkbook();
  const ws = await wb.addWorksheet("Test");

  await ws.cell(0, 0).setValue("Row0");
  await ws.cell(1, 0).setValue("Row1");
  await ws.cell(2, 0).setValue("Row2");

  // Create merge A1:B1 (row 0)
  await ws.cell(0, 0).merge(0, 1);

  // Insert copy of row 1 at position 2
  await ws.insertCopyRow(1, 2);

  const wsData = await ws["_getWsData"]();
  const merges = wsData.getMergeCells();

  // Merge should remain unchanged at A1:B1
  expect(merges).toEqual([
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
  ]);
});
```

**Step 6: Run all insertCopyRow tests**

```bash
pnpm run vitest packages/excel/tests/excel-worksheet.spec.ts -t "insertCopyRow" --run
```

Expected: `PASS (all 6 tests)`

**Step 7: Commit**

```bash
git add packages/excel/src/excel-worksheet.ts packages/excel/tests/excel-worksheet.spec.ts
git commit -m "fix(excel): fix insertCopyRow merge cell shifting"
```

---

## Task 4: Fix background color documentation

**Files:**
- Modify: `packages/excel/src/excel-cell.ts:230`

**Context:**
The JSDoc example at line 230 shows `"FFFF0000"` (standard ARGB with opaque alpha FF), but the codebase actually uses reversed alpha convention where `00` = opaque. This is confirmed by border colors like `"00000000"` (opaque black) and the error message at line 241 saying `"alpha(reversed)+rgb"`.

**Step 1: Read current JSDoc**

The current text is:
```typescript
* @param opts.background Background color (ARGB format, 8-digit hex. e.g. "FFFF0000")
```

**Step 2: Fix the example**

In `packages/excel/src/excel-cell.ts`, modify line 230 to:

```typescript
* @param opts.background Background color (ARGB format, 8-digit hex. e.g. "00FF0000")
```

**Step 3: Verify no other changes needed**

The error message at line 241 already says `"alpha(reversed)+rgb"` and the example in `types.ts:373` already uses `"00FF0000"`, so they're consistent.

**Step 4: No test needed**

This is a documentation-only change with no functional code modification.

**Step 5: Commit**

```bash
git add packages/excel/src/excel-cell.ts
git commit -m "docs(excel): fix background color format example in JSDoc"
```

---

## Task 5: Fix ExcelCellData type for cell type field

**Files:**
- Modify: `packages/excel/src/types.ts:146`
- Modify: `packages/excel/src/xml/excel-xml-worksheet.ts:88`

**Context:**
The `ExcelCellData.$.t` field is currently typed as `string | undefined`, but it only ever holds `ExcelCellType` values (`"s"`, `"b"`, `"str"`, `"n"`, `"inlineStr"`, `"e"`, or undefined). By narrowing the type, we can remove the unsafe cast in `getCellType()`.

**Step 1: Write the test**

```typescript
it("should have correct ExcelCellData type for cell type field", () => {
  const cellData: ExcelCellData = {
    $: { r: "A1", t: "s" },
    v: ["test"],
  };

  // This should compile without needing cast
  const cellType: ExcelCellType | undefined = cellData.$.t;
  expect(cellType).toBe("s");
});
```

Add to `packages/excel/tests/excel-cell.spec.ts`:

```typescript
it("should type cell type field as ExcelCellType", () => {
  const cellData: ExcelCellData = {
    $: { r: "A1", t: "s" },
    v: ["test"],
  };

  const cellType: ExcelCellType | undefined = cellData.$.t;
  expect(cellType).toBe("s");

  // This should compile: no cast needed
  expect(["s", "b", "str", "n", "inlineStr", "e", undefined].includes(cellData.$.t)).toBe(true);
});
```

**Step 2: Run test to verify it fails (with current type)**

```bash
pnpm run vitest packages/excel/tests/excel-cell.spec.ts -t "type cell type field" --run
```

Expected: TypeScript compile error or runtime type mismatch (depending on how strict the test is).

**Step 3: Update ExcelCellData interface**

In `packages/excel/src/types.ts`, change line 146 from:

```typescript
    t?: string; // type: s(sharedString)
```

To:

```typescript
    t?: ExcelCellType; // type: s(sharedString)
```

**Step 4: Remove the cast in getCellType()**

In `packages/excel/src/xml/excel-xml-worksheet.ts`, change line 88 from:

```typescript
  getCellType(addr: { r: number; c: number }): ExcelCellType | undefined {
    return this._getCellData(addr)?.$.t as ExcelCellType | undefined;
  }
```

To:

```typescript
  getCellType(addr: { r: number; c: number }): ExcelCellType | undefined {
    return this._getCellData(addr)?.$.t;
  }
```

**Step 5: Run test to verify it passes**

```bash
pnpm run vitest packages/excel/tests/excel-cell.spec.ts -t "type cell type field" --run
pnpm run vitest packages/excel/tests/ --run
```

Expected: `PASS` (all tests pass, no TypeScript errors)

**Step 6: Verify no regressions**

```bash
pnpm run typecheck
```

Expected: No TypeScript errors.

**Step 7: Commit**

```bash
git add packages/excel/src/types.ts packages/excel/src/xml/excel-xml-worksheet.ts packages/excel/tests/excel-cell.spec.ts
git commit -m "fix(excel): narrow ExcelCellData.t type from string to ExcelCellType"
```

---

## Final Verification

After all tasks are complete, run full test suite to ensure no regressions:

```bash
pnpm run vitest packages/excel/tests/ --run
pnpm run typecheck
```

Expected: All tests pass, no TypeScript errors.
