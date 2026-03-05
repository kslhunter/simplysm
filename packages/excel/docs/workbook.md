# Core Classes

## ExcelWorkbook

The top-level class for reading and writing Excel workbooks. Internally manages ZIP resources; resources must be released after use.

The class supports `await using` (ES2022 `Symbol.asyncDispose`).

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// Open an existing workbook
const bytes: Uint8Array = /* file bytes */;
await using wb = new ExcelWorkbook(bytes);

// Create a new workbook
await using wb = new ExcelWorkbook();
const ws = await wb.addWorksheet("Sheet1");

// Get worksheet names
const names = await wb.getWorksheetNames();

// Access a worksheet by index or name
const ws = await wb.getWorksheet(0);
const ws2 = await wb.getWorksheet("Sheet1");

// Export
const exportedBytes = await wb.toBytes();
const blob = await wb.toBlob();

// Manual resource management
const wb2 = new ExcelWorkbook(bytes);
try {
  const ws = await wb2.getWorksheet(0);
  // ...
} finally {
  await wb2.close();
}
```

**Constructor**

```typescript
constructor(arg?: Blob | Bytes)
```

- `arg` — Existing Excel file data (`Blob` or `Uint8Array`). Creates a new empty workbook if omitted.

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getWorksheetNames` | `() => Promise<string[]>` | Return all worksheet names in the workbook |
| `addWorksheet` | `(name: string) => Promise<ExcelWorksheet>` | Create and return a new worksheet |
| `getWorksheet` | `(nameOrIndex: string \| number) => Promise<ExcelWorksheet>` | Look up a worksheet by name or 0-based index |
| `toBytes` | `() => Promise<Bytes>` | Export workbook as a `Uint8Array` byte array |
| `toBlob` | `() => Promise<Blob>` | Export workbook as a `Blob` |
| `close` | `() => Promise<void>` | Release all resources (idempotent) |
| `[Symbol.asyncDispose]` | `() => Promise<void>` | Called automatically by `await using` |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `zipCache` | `ZipCache` | Internal ZIP cache (advanced use) |

---

## ExcelWorksheet

Represents a single worksheet. Provides cell access, row/column copy operations, data import/export, view settings, and image insertion.

```typescript
import { ExcelWorksheet } from "@simplysm/excel";

// Obtained from ExcelWorkbook
const ws = await wb.getWorksheet(0);

// Name
const name = await ws.getName();
await ws.setName("NewName");

// Cell access
const cell = ws.cell(0, 0);       // row 0, col 0 -> A1
const row = ws.row(1);            // row 1 (second row)
const col = ws.col(2);            // col 2 -> column C

// Range and bulk cell access
const range = await ws.getRange();
const cells = await ws.getCells(); // ExcelCell[][]

// Copy operations
await ws.copyRow(0, 5);                            // copy row 0 to row 5
await ws.copyRowStyle(0, 5);                       // copy row 0 style to row 5
await ws.copyCell({ r: 0, c: 0 }, { r: 5, c: 0 }); // copy single cell
await ws.copyCellStyle({ r: 0, c: 0 }, { r: 5, c: 0 });
await ws.insertCopyRow(0, 3);                      // insert-copy row 0 at position 3

// Read as table (first row = headers)
const table = await ws.getDataTable();
const table2 = await ws.getDataTable({
  headerRowIndex: 0,
  checkEndColIndex: 0,
  usableHeaderNameFn: (name) => name !== "ignore",
});

// Write data
await ws.setDataMatrix([[1, "hello"], [2, "world"]]);
await ws.setRecords([{ Name: "Alice", Age: 30 }]);

// View settings
await ws.setZoom(85);          // 85%
await ws.freezeAt({ r: 1 });     // freeze first row
await ws.freezeAt({ c: 1 });     // freeze first column
await ws.freezeAt({ r: 1, c: 1 }); // freeze both

// Insert image
await ws.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 0, c: 0 },
  to: { r: 5, c: 3 },
});
```

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getName` | `() => Promise<string>` | Return the worksheet name |
| `setName` | `(newName: string) => Promise<void>` | Rename the worksheet |
| `row` | `(r: number) => ExcelRow` | Return the `ExcelRow` at 0-based row index |
| `cell` | `(r: number, c: number) => ExcelCell` | Return the `ExcelCell` at 0-based row/column |
| `col` | `(c: number) => ExcelCol` | Return the `ExcelCol` at 0-based column index |
| `getRange` | `() => Promise<ExcelAddressRangePoint>` | Return the used data range |
| `getCells` | `() => Promise<ExcelCell[][]>` | Return all cells as a 2D array (row-major) |
| `copyRow` | `(srcR: number, targetR: number) => Promise<void>` | Copy source row to target row (overwrite) |
| `copyRowStyle` | `(srcR: number, targetR: number) => Promise<void>` | Copy style from source row to target row |
| `copyCell` | `(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint) => Promise<void>` | Copy a single cell |
| `copyCellStyle` | `(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint) => Promise<void>` | Copy style from source cell to target cell |
| `insertCopyRow` | `(srcR: number, targetR: number) => Promise<void>` | Insert-copy source row at target position (shifts rows down) |
| `getDataTable` | `(opt?) => Promise<Record<string, ExcelValueType>[]>` | Read worksheet as a header-keyed record array |
| `setDataMatrix` | `(matrix: ExcelValueType[][]) => Promise<void>` | Write a 2D array to the worksheet |
| `setRecords` | `(records: Record<string, ExcelValueType>[]) => Promise<void>` | Write records with auto-generated header row |
| `setZoom` | `(percent: number) => Promise<void>` | Set the worksheet zoom level |
| `freezeAt` | `(point: { r?: number; c?: number }) => Promise<void>` | Set freeze panes |
| `addImage` | `(opts) => Promise<void>` | Insert an image into the worksheet |

**`getDataTable` options**

```typescript
{
  headerRowIndex?: number;          // Row index of the header row (default: first row in range)
  checkEndColIndex?: number;        // Column whose empty value signals end of data
  usableHeaderNameFn?: (headerName: string) => boolean; // Filter which headers to include
}
```

**`addImage` options**

```typescript
{
  bytes: Bytes;       // Image binary data (Uint8Array)
  ext: string;        // File extension, e.g. "png", "jpg"
  from: { r: number; c: number; rOff?: number | string; cOff?: number | string }; // Start cell (0-based), optional EMU offset
  to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };  // End cell (optional)
}
```

---

## ExcelRow

Represents a row in a worksheet. Provides access to individual cells and all cells in the row.

```typescript
import { ExcelRow } from "@simplysm/excel";

// Obtained from ExcelWorksheet
const row = ws.row(0);

// Access a cell by column index (0-based)
const cell = row.cell(2); // column C

// Get all cells in the row (within used range)
const cells = await row.getCells();
```

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `cell` | `(c: number) => ExcelCell` | Return the `ExcelCell` at the given 0-based column index |
| `getCells` | `() => Promise<ExcelCell[]>` | Return all cells in the row within the worksheet's used range |

---

## ExcelCol

Represents a column in a worksheet. Provides access to individual cells, all cells in the column, and column width configuration.

```typescript
import { ExcelCol } from "@simplysm/excel";

// Obtained from ExcelWorksheet
const col = ws.col(0); // column A

// Access a cell by row index (0-based)
const cell = col.cell(3); // row 3

// Get all cells in the column (within used range)
const cells = await col.getCells();

// Set column width
await col.setWidth(20);
```

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `cell` | `(r: number) => ExcelCell` | Return the `ExcelCell` at the given 0-based row index |
| `getCells` | `() => Promise<ExcelCell[]>` | Return all cells in the column within the worksheet's used range |
| `setWidth` | `(size: number) => Promise<void>` | Set the column width |

---

## ExcelCell

Represents a single cell. Provides value read/write, formula access, style configuration, and cell merge.

All methods are `async` because XML sub-files (SharedStrings, Styles) are loaded lazily on demand.

```typescript
import { ExcelCell } from "@simplysm/excel";

// Obtained from ExcelWorksheet or ExcelRow/ExcelCol
const cell = ws.cell(0, 0); // A1

// Cell address (0-based)
console.log(cell.addr); // { r: 0, c: 0 }

// Read/write values
await cell.setValue("Hello");
await cell.setValue(42);
await cell.setValue(true);
await cell.setValue(new DateOnly(Date.now()));
await cell.setValue(new DateTime(Date.now()));
await cell.setValue(new Time(Date.now()));
await cell.setValue(undefined); // deletes the cell

const value = await cell.getValue(); // ExcelValueType

// Formulas
await cell.setFormula("=SUM(A1:A10)");
await cell.setFormula(undefined); // removes formula
const formula = await cell.getFormula();

// Style
await cell.setStyle({
  background: "00FFFF00",            // ARGB, 8-digit hex (yellow)
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "number",
});

// Raw style ID (advanced use)
const styleId = await cell.getStyleId();
await cell.setStyleId("3");

// Merge cells
// Merge from this cell (A1) to C3
await cell.merge(2, 2); // end row=2, end col=2
```

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `addr` | `ExcelAddressPoint` | Cell address (0-based `{ r, c }`) |

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getValue` | `() => Promise<ExcelValueType>` | Read the cell value |
| `setValue` | `(val: ExcelValueType) => Promise<void>` | Write the cell value (`undefined` deletes the cell) |
| `getFormula` | `() => Promise<string \| undefined>` | Read the cell formula |
| `setFormula` | `(val: string \| undefined) => Promise<void>` | Write the cell formula (`undefined` removes it) |
| `getStyleId` | `() => Promise<string \| undefined>` | Read the raw style ID |
| `setStyleId` | `(styleId: string \| undefined) => Promise<void>` | Set the raw style ID |
| `setStyle` | `(opts: ExcelStyleOptions) => Promise<void>` | Apply style options to the cell |
| `merge` | `(r: number, c: number) => Promise<void>` | Merge from this cell to the given end coordinates (0-based) |
