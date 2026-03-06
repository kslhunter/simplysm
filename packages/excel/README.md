# @simplysm/excel

Excel file processing library for reading, writing, and manipulating `.xlsx` files.

## Installation

```bash
pnpm add @simplysm/excel
```

## Quick Example

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// Read an existing file
const bytes: Uint8Array = /* file bytes */;
await using wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);
const table = await ws.getDataTable(); // [{ Name: "Alice", Age: 30 }, ...]

// Create a new file
await using wb2 = new ExcelWorkbook();
const ws2 = await wb2.addWorksheet("Sheet1");
await ws2.setRecords([{ Name: "Alice", Age: 30 }]);
const output = await wb2.toBytes();
```

---

## Types and Utilities

### `ExcelValueType`

Union of all supported cell value types.

```typescript
import { ExcelValueType } from "@simplysm/excel";

type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

### `ExcelNumberFormat`

Named number format for a cell.

```typescript
import { ExcelNumberFormat } from "@simplysm/excel";

type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

### `ExcelCellType`

Raw Excel cell type code stored in the XML.

```typescript
import { ExcelCellType } from "@simplysm/excel";

// "s"         - shared string
// "b"         - boolean
// "str"       - formula result string
// "n"         - number
// "inlineStr" - inline string (rich text)
// "e"         - error
type ExcelCellType = "s" | "b" | "str" | "n" | "inlineStr" | "e";
```

### `ExcelAddressPoint`

A 0-based row/column coordinate pair.

```typescript
import { ExcelAddressPoint } from "@simplysm/excel";

interface ExcelAddressPoint {
  r: number; // 0-based row index
  c: number; // 0-based column index
}
```

### `ExcelAddressRangePoint`

A range defined by start and end `ExcelAddressPoint` values.

```typescript
import { ExcelAddressRangePoint } from "@simplysm/excel";

interface ExcelAddressRangePoint {
  s: ExcelAddressPoint; // start (top-left)
  e: ExcelAddressPoint; // end (bottom-right)
}
```

### `ExcelStyleOptions`

Options for `ExcelCell.setStyle()`.

```typescript
import { ExcelStyleOptions } from "@simplysm/excel";

interface ExcelStyleOptions {
  background?: string;                   // ARGB 8-digit hex, e.g. "FFFF0000" (red)
  border?: ExcelBorderPosition[];        // Border sides to draw
  horizontalAlign?: ExcelHorizontalAlign;
  verticalAlign?: ExcelVerticalAlign;
  numberFormat?: ExcelNumberFormat;
}
```

### `ExcelBorderPosition`

```typescript
import { ExcelBorderPosition } from "@simplysm/excel";

type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
```

### `ExcelHorizontalAlign`

```typescript
import { ExcelHorizontalAlign } from "@simplysm/excel";

type ExcelHorizontalAlign = "center" | "left" | "right";
```

### `ExcelVerticalAlign`

```typescript
import { ExcelVerticalAlign } from "@simplysm/excel";

type ExcelVerticalAlign = "center" | "top" | "bottom";
```

### XML Data Types

These interfaces represent the raw XML structures parsed from the `.xlsx` ZIP package. Exported for advanced use cases (e.g., directly reading the parsed XML tree).

```typescript
import {
  ExcelXmlContentTypeData,
  ExcelXmlRelationshipData,
  ExcelRelationshipData,
  ExcelXmlWorkbookData,
  ExcelXmlWorksheetData,
  ExcelRowData,
  ExcelCellData,
  ExcelXmlDrawingData,
  ExcelXmlSharedStringData,
  ExcelXmlSharedStringDataSi,
  ExcelXmlSharedStringDataText,
  ExcelXmlStyleData,
  ExcelXmlStyleDataXf,
  ExcelXmlStyleDataFill,
  ExcelXmlStyleDataBorder,
  ExcelXml,
} from "@simplysm/excel";
```

| Interface / Type | Description |
|-----------------|-------------|
| `ExcelXmlContentTypeData` | `[Content_Types].xml` document structure |
| `ExcelXmlRelationshipData` | `.rels` relationship file structure |
| `ExcelRelationshipData` | A single relationship entry |
| `ExcelXmlWorkbookData` | `xl/workbook.xml` document structure |
| `ExcelXmlWorksheetData` | `xl/worksheets/sheetN.xml` document structure |
| `ExcelRowData` | A row element within worksheet XML |
| `ExcelCellData` | A cell element within worksheet XML |
| `ExcelXmlDrawingData` | Drawing XML structure (`xl/drawings/drawingN.xml`) |
| `ExcelXmlSharedStringData` | Shared strings XML structure |
| `ExcelXmlSharedStringDataSi` | A shared string entry (plain or rich text) |
| `ExcelXmlSharedStringDataText` | Text content within a shared string entry |
| `ExcelXmlStyleData` | Styles XML document structure |
| `ExcelXmlStyleDataXf` | A cell format (`xf`) entry |
| `ExcelXmlStyleDataFill` | A fill entry |
| `ExcelXmlStyleDataBorder` | A border entry |
| `ExcelXml` | Interface implemented by all XML handler classes |

### `ExcelUtils`

A static utility class providing cell address conversion, date/number conversion, and number format processing.

```typescript
import { ExcelUtils } from "@simplysm/excel";

// Convert 0-based coordinates to "A1" notation
ExcelUtils.stringifyAddr({ r: 0, c: 0 }); // "A1"

// Convert column index to column letter(s)
ExcelUtils.stringifyColAddr(0);  // "A"
ExcelUtils.stringifyColAddr(26); // "AA"

// Convert row index to row number string
ExcelUtils.stringifyRowAddr(0); // "1"

// Parse cell address
ExcelUtils.parseCellAddr("B3"); // { r: 2, c: 1 }
ExcelUtils.parseRowAddr("B3"); // 2
ExcelUtils.parseColAddr("B3"); // 1

// Parse range address
ExcelUtils.parseRangeAddr("A1:C3"); // { s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }

// Convert range coordinates to address string
ExcelUtils.stringifyRangeAddr({ s: { r: 0, c: 0 }, e: { r: 2, c: 2 } }); // "A1:C3"

// Date/number conversion (Excel serial date <-> JS timestamp)
const excelNum = ExcelUtils.convertTimeTickToNumber(Date.now());
const tick = ExcelUtils.convertNumberToTimeTick(excelNum);

// Number format conversions
ExcelUtils.convertNumFmtCodeToName("General"); // "number"
ExcelUtils.convertNumFmtIdToName(14);          // "DateOnly"
ExcelUtils.convertNumFmtNameToId("DateTime");  // 22
```

**Static Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `stringifyAddr` | `(point: ExcelAddressPoint) => string` | Convert coordinates to "A1" format |
| `stringifyRowAddr` | `(r: number) => string` | Convert 0-based row index to row number string |
| `stringifyColAddr` | `(c: number) => string` | Convert 0-based column index to column letter(s) |
| `parseRowAddr` | `(addr: string) => number` | Extract 0-based row index from cell address |
| `parseColAddr` | `(addr: string) => number` | Extract 0-based column index from cell address |
| `parseCellAddr` | `(addr: string) => ExcelAddressPoint` | Convert cell address string to coordinates |
| `parseRangeAddr` | `(rangeAddr: string) => ExcelAddressRangePoint` | Convert range address to coordinate pair |
| `stringifyRangeAddr` | `(point: ExcelAddressRangePoint) => string` | Convert coordinate pair to range address string |
| `convertTimeTickToNumber` | `(tick: number) => number` | Convert JS timestamp (ms) to Excel serial date number |
| `convertNumberToTimeTick` | `(value: number) => number` | Convert Excel serial date number to JS timestamp (ms) |
| `convertNumFmtCodeToName` | `(numFmtCode: string) => ExcelNumberFormat` | Convert format code string to format name |
| `convertNumFmtIdToName` | `(numFmtId: number) => ExcelNumberFormat` | Convert built-in format ID to format name |
| `convertNumFmtNameToId` | `(numFmtName: ExcelNumberFormat) => number` | Convert format name to built-in format ID |

---

## Core Classes

### `ExcelWorkbook`

The top-level class for reading and writing Excel workbooks. Internally manages ZIP resources; resources must be released after use.

Supports `await using` (ES2022 `Symbol.asyncDispose`). Internally uses lazy-loading: XML inside the ZIP is parsed only at the point of access, keeping memory usage low even with large files.

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// Open an existing workbook
const bytes: Uint8Array = /* file bytes */;
await using wb = new ExcelWorkbook(bytes);

// Create a new workbook
await using wb2 = new ExcelWorkbook();
const ws = await wb2.addWorksheet("Sheet1");

// Get all worksheet names
const names = await wb.getWorksheetNames();

// Access a worksheet by index or name
const ws0 = await wb.getWorksheet(0);
const ws1 = await wb.getWorksheet("Sheet1");

// Export
const exportedBytes = await wb.toBytes();
const blob = await wb.toBlob();

// Manual resource management
const wb3 = new ExcelWorkbook(bytes);
try {
  const ws = await wb3.getWorksheet(0);
  // ...
} finally {
  await wb3.close();
}
```

**Constructor**

```typescript
constructor(arg?: Blob | Bytes)
```

- `arg` — Existing Excel file data (`Blob` or `Uint8Array`). Creates a new empty workbook if omitted.

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `zipCache` | `ZipCache` | Internal ZIP cache (advanced use) |

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

---

### `ExcelWorksheet`

Represents a single worksheet. Provides cell access, row/column copy operations, data import/export, view settings, and image insertion.

```typescript
import { ExcelWorksheet } from "@simplysm/excel";

// Obtained from ExcelWorkbook
const ws = await wb.getWorksheet(0);

// Name
const name = await ws.getName();
await ws.setName("NewName");

// Cell access
const cell = ws.cell(0, 0); // row 0, col 0 -> A1
const row  = ws.row(1);     // row 1 (second row)
const col  = ws.col(2);     // col 2 -> column C

// Range and bulk cell access
const range = await ws.getRange();
const cells = await ws.getCells(); // ExcelCell[][]

// Copy operations
await ws.copyRow(0, 5);                              // copy row 0 to row 5
await ws.copyRowStyle(0, 5);                         // copy style of row 0 to row 5
await ws.copyCell({ r: 0, c: 0 }, { r: 5, c: 0 });  // copy single cell
await ws.copyCellStyle({ r: 0, c: 0 }, { r: 5, c: 0 });
await ws.insertCopyRow(0, 3); // insert-copy row 0 at position 3, shifting rows down

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
await ws.setZoom(85);              // 85%
await ws.freezeAt({ r: 1 });      // freeze first row
await ws.freezeAt({ c: 1 });      // freeze first column
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
  headerRowIndex?: number;                              // Row index of the header row (default: first row in range)
  checkEndColIndex?: number;                            // Column whose empty value signals end of data
  usableHeaderNameFn?: (headerName: string) => boolean; // Filter which headers to include
}
```

**`addImage` options**

```typescript
{
  bytes: Bytes;  // Image binary data (Uint8Array)
  ext: string;   // File extension, e.g. "png", "jpg"
  from: { r: number; c: number; rOff?: number | string; cOff?: number | string }; // Start cell (0-based), optional EMU offset
  to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };  // End cell (optional; defaults to from.r+1, from.c+1)
}
```

---

### `ExcelRow`

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

### `ExcelCol`

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

### `ExcelCell`

Represents a single cell. Provides value read/write, formula access, style configuration, and cell merge.

All methods are `async` because XML sub-files (SharedStrings, Styles) are loaded lazily on demand.

```typescript
import { ExcelCell } from "@simplysm/excel";

// Obtained from ExcelWorksheet, ExcelRow, or ExcelCol
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
  background: "00FFFF00",                         // ARGB 8-digit hex (yellow)
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "number",
});

// Raw style ID (advanced use)
const styleId = await cell.getStyleId();
await cell.setStyleId("3");

// Merge cells: merge from this cell (A1) to C3
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

---

## Wrapper Classes

### `ExcelWrapper`

A Zod schema-based high-level wrapper that provides type-safe reading and writing of Excel files. Use `.describe()` on schema fields to specify the Excel column header name.

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
  joinDate: z.instanceof(DateOnly).optional().describe("Join Date"),
});

const wrapper = new ExcelWrapper(schema);

// Read Excel file into typed records
const records = await wrapper.read(fileBytes);
const records2 = await wrapper.read(fileBytes, "Sheet1");
const records3 = await wrapper.read(fileBytes, 0, { excludes: ["age"] });

// Write records to Excel workbook
await using wb = await wrapper.write("Members", records);
const bytes = await wb.toBytes();

// Write with excludes
await using wb2 = await wrapper.write("Members", records, { excludes: ["joinDate"] });
```

**Constructor**

```typescript
constructor(schema: TSchema extends z.ZodObject<z.ZodRawShape>)
```

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `read` | `(file: Bytes \| Blob, wsNameOrIndex?: string \| number, options?: { excludes?: (keyof TSchema)[] }) => Promise<z.infer<TSchema>[]>` | Read an Excel file into a typed record array |
| `write` | `(wsName: string, records: Partial<z.infer<TSchema>>[], options?: { excludes?: (keyof TSchema)[] }) => Promise<ExcelWorkbook>` | Write records to a new `ExcelWorkbook` (caller manages lifecycle) |

**Behavior Notes**

- Header names are taken from Zod field `.describe()` values; if not set, the field key is used.
- `read` throws if no data rows are found after the header row.
- `read` validates each row with the Zod schema and throws on validation failure.
- `write` automatically applies borders to all data cells, highlights required (non-optional, non-boolean) header cells with a yellow background (`"00FFFF00"`), sets zoom to 85%, and freezes the first row.
- The `ExcelWorkbook` returned by `write` must be closed by the caller (`await using` or `.close()`).
