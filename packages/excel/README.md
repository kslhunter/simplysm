# @simplysm/excel

Excel file (.xlsx) processing library for reading, writing, and manipulating workbooks. Supports both low-level cell operations and high-level schema-based data mapping via Zod.

Works in both Node.js and browser environments. Uses lazy-loading architecture for memory-efficient handling of large files.

## Installation

```bash
npm install @simplysm/excel
```

**Peer dependency:** `@simplysm/core-common`

## Quick Start

### Create and export a workbook

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook();
const ws = await wb.addWorksheet("Sheet1");

await ws.cell(0, 0).setValue("Name");
await ws.cell(0, 1).setValue("Age");
await ws.cell(1, 0).setValue("Alice");
await ws.cell(1, 1).setValue(30);

const bytes = await wb.toBytes(); // Uint8Array
const blob = await wb.toBlob();   // Blob (for browser downloads)
```

### Read an existing workbook

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook(fileBytes); // Uint8Array or Blob
const ws = await wb.getWorksheet(0);           // by index
// const ws = await wb.getWorksheet("Sheet1"); // or by name

const value = await ws.cell(0, 0).getValue();  // read cell value
```

### Schema-based read/write with ExcelWrapper

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

const schema = z.object({
  name: z.string().describe("Name"),           // .describe() sets the Excel header
  age: z.number().describe("Age"),
  email: z.string().optional().describe("Email"),
  active: z.boolean().default(false).describe("Active"),
});

const wrapper = new ExcelWrapper(schema);

// Write records to Excel
await using wb = await wrapper.write("Users", [
  { name: "Alice", age: 30, email: "alice@example.com", active: true },
  { name: "Bob", age: 25 },
]);
const bytes = await wb.toBytes();

// Read records from Excel
const records = await wrapper.read(bytes, "Users");
// records[0] => { name: "Alice", age: 30, email: "alice@example.com", active: true }
```

## API Reference

### ExcelWorkbook

Excel workbook processing class. Manages ZIP resources internally and uses lazy-loading for memory efficiency.

**Resource management:** Always release resources after use via `await using` (recommended) or `close()`.

```typescript
// Recommended: automatic cleanup
await using wb = new ExcelWorkbook(bytes);

// Alternative: manual cleanup
const wb = new ExcelWorkbook(bytes);
try {
  // ... operations
} finally {
  await wb.close();
}
```

#### Constructor

```typescript
new ExcelWorkbook()                // create empty workbook
new ExcelWorkbook(bytes: Bytes)    // open from Uint8Array
new ExcelWorkbook(blob: Blob)      // open from Blob
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getWorksheetNames()` | `Promise<string[]>` | Return all worksheet names |
| `getWorksheet(index: number)` | `Promise<ExcelWorksheet>` | Get worksheet by 0-based index |
| `getWorksheet(name: string)` | `Promise<ExcelWorksheet>` | Get worksheet by name |
| `addWorksheet(name: string)` | `Promise<ExcelWorksheet>` | Create a new worksheet |
| `toBytes()` | `Promise<Bytes>` | Export workbook as byte array |
| `toBlob()` | `Promise<Blob>` | Export workbook as Blob |
| `close()` | `Promise<void>` | Release resources (safe to call multiple times) |

---

### ExcelWorksheet

Represents a worksheet. Provides cell access, row/column operations, data table processing, and image insertion.

#### Cell Access

| Method | Returns | Description |
|--------|---------|-------------|
| `cell(r, c)` | `ExcelCell` | Get cell at row `r`, column `c` (0-based) |
| `row(r)` | `ExcelRow` | Get row object (0-based) |
| `col(c)` | `ExcelCol` | Get column object (0-based) |
| `getCells()` | `Promise<ExcelCell[][]>` | Get all cells as a 2D array |
| `getRange()` | `Promise<ExcelAddressRangePoint>` | Get the data range of the worksheet |

#### Name

| Method | Returns | Description |
|--------|---------|-------------|
| `getName()` | `Promise<string>` | Get worksheet name |
| `setName(name)` | `Promise<void>` | Rename worksheet |

#### Data Operations

| Method | Returns | Description |
|--------|---------|-------------|
| `getDataTable(opt?)` | `Promise<Record<string, ExcelValueType>[]>` | Read data as record array (first row = headers) |
| `setDataMatrix(matrix)` | `Promise<void>` | Write 2D array data |
| `setRecords(records)` | `Promise<void>` | Write record array (auto-generates headers) |

**`getDataTable` options:**

| Option | Type | Description |
|--------|------|-------------|
| `headerRowIndex` | `number` | Header row index (default: first row of range) |
| `checkEndColIndex` | `number` | Column index to detect data end (stops when empty) |
| `usableHeaderNameFn` | `(name: string) => boolean` | Filter function for usable headers |

#### Copy Operations

| Method | Returns | Description |
|--------|---------|-------------|
| `copyRow(srcR, targetR)` | `Promise<void>` | Copy row (overwrite target) |
| `copyCell(srcAddr, targetAddr)` | `Promise<void>` | Copy cell |
| `copyRowStyle(srcR, targetR)` | `Promise<void>` | Copy row style only |
| `copyCellStyle(srcAddr, targetAddr)` | `Promise<void>` | Copy cell style only |
| `insertCopyRow(srcR, targetR)` | `Promise<void>` | Insert-copy row (shifts existing rows down) |

#### View Settings

| Method | Returns | Description |
|--------|---------|-------------|
| `setZoom(percent)` | `Promise<void>` | Set zoom scale |
| `freezeAt({ r?, c? })` | `Promise<void>` | Freeze panes at row/column |

#### Image

```typescript
await ws.addImage({
  bytes: imageBytes,        // image binary data (Uint8Array)
  ext: "png",               // file extension
  from: { r: 0, c: 0 },    // start position (0-based)
  to: { r: 5, c: 3 },      // end position (optional)
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `bytes` | `Bytes` | Image binary data |
| `ext` | `string` | Image extension (png, jpg, etc.) |
| `from` | `{ r, c, rOff?, cOff? }` | Start position. `rOff`/`cOff` are EMU offsets. |
| `to` | `{ r, c, rOff?, cOff? }` | End position. Defaults to one cell from `from`. |

---

### ExcelCell

Represents a single cell. All methods are async for lazy-loading efficiency.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `addr` | `ExcelAddressPoint` | Cell address (`{ r, c }`, 0-based) |

#### Value

| Method | Returns | Description |
|--------|---------|-------------|
| `getValue()` | `Promise<ExcelValueType>` | Get cell value |
| `setValue(val)` | `Promise<void>` | Set cell value (`undefined` deletes the cell) |
| `getFormula()` | `Promise<string \| undefined>` | Get cell formula |
| `setFormula(val)` | `Promise<void>` | Set cell formula (`undefined` removes it) |

Supported value types (`ExcelValueType`): `string`, `number`, `boolean`, `DateOnly`, `DateTime`, `Time`, `undefined`

#### Style

| Method | Returns | Description |
|--------|---------|-------------|
| `setStyle(opts)` | `Promise<void>` | Set cell style |
| `getStyleId()` | `Promise<string \| undefined>` | Get raw style ID |
| `setStyleId(id)` | `Promise<void>` | Set raw style ID |

**Style options (`ExcelStyleOptions`):**

```typescript
await cell.setStyle({
  background: "00FF0000",                          // ARGB hex (8 digits)
  border: ["left", "right", "top", "bottom"],      // border positions
  horizontalAlign: "center",                       // "left" | "center" | "right"
  verticalAlign: "center",                         // "top" | "center" | "bottom"
  numberFormat: "number",                          // "number" | "string" | "DateOnly" | "DateTime" | "Time"
});
```

#### Merge

| Method | Returns | Description |
|--------|---------|-------------|
| `merge(r, c)` | `Promise<void>` | Merge from this cell to end position `(r, c)` |

```typescript
// Merge A1:C3 (3 rows x 3 columns)
await ws.cell(0, 0).merge(2, 2);
```

---

### ExcelRow

Represents a worksheet row.

| Method | Returns | Description |
|--------|---------|-------------|
| `cell(c)` | `ExcelCell` | Get cell at column `c` (0-based) |
| `getCells()` | `Promise<ExcelCell[]>` | Get all cells in the row |

---

### ExcelCol

Represents a worksheet column.

| Method | Returns | Description |
|--------|---------|-------------|
| `cell(r)` | `ExcelCell` | Get cell at row `r` (0-based) |
| `getCells()` | `Promise<ExcelCell[]>` | Get all cells in the column |
| `setWidth(size)` | `Promise<void>` | Set column width |

---

### ExcelWrapper\<TSchema\>

Zod schema-based Excel wrapper for type-safe read/write. Define a Zod object schema where each field's `.describe()` sets the Excel column header name.

#### Constructor

```typescript
new ExcelWrapper(schema: z.ZodObject<z.ZodRawShape>)
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `read(file, wsNameOrIndex?, options?)` | `Promise<z.infer<TSchema>[]>` | Read Excel file into typed record array |
| `write(wsName, records, options?)` | `Promise<ExcelWorkbook>` | Write records to a new workbook |

**`read` parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `file` | `Bytes \| Blob` | | Excel file data |
| `wsNameOrIndex` | `string \| number` | `0` | Worksheet name or index |
| `options.excludes` | `(keyof T)[]` | | Fields to exclude from reading |

**`write` parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `wsName` | `string` | Worksheet name |
| `records` | `Partial<T>[]` | Record array to write |
| `options.excludes` | `(keyof T)[]` | Fields to exclude from columns |

**Write behavior:**
- Generates headers from schema field descriptions
- Applies border style to all data cells
- Highlights required field headers with yellow background
- Sets zoom to 85% and freezes the header row

**Supported Zod types:** `z.string()`, `z.number()`, `z.boolean()`, `z.instanceof(DateOnly)`, `z.instanceof(DateTime)`, `z.instanceof(Time)`. Supports `z.optional()`, `z.nullable()`, `z.default()` wrappers.

---

### ExcelUtils

Static utility class for Excel address conversion and date/number processing.

#### Address Conversion

| Method | Returns | Description |
|--------|---------|-------------|
| `stringifyAddr({ r, c })` | `string` | Coordinates to "A1" format |
| `stringifyRowAddr(r)` | `string` | Row index to string (0 -> "1") |
| `stringifyColAddr(c)` | `string` | Column index to string (0 -> "A", 26 -> "AA") |
| `parseCellAddr(addr)` | `ExcelAddressPoint` | "B3" -> `{ r: 2, c: 1 }` |
| `parseRowAddr(addr)` | `number` | Extract row index from address |
| `parseColAddr(addr)` | `number` | Extract column index from address |
| `parseRangeAddr(rangeAddr)` | `ExcelAddressRangePoint` | "A1:C3" -> `{ s: {r:0,c:0}, e: {r:2,c:2} }` |
| `stringifyRangeAddr(point)` | `string` | Range coordinates to "A1:C3" format |

#### Date/Number Conversion

| Method | Returns | Description |
|--------|---------|-------------|
| `convertTimeTickToNumber(tick)` | `number` | JS timestamp (ms) to Excel date number |
| `convertNumberToTimeTick(value)` | `number` | Excel date number to JS timestamp (ms) |

#### Number Format

| Method | Returns | Description |
|--------|---------|-------------|
| `convertNumFmtIdToName(id)` | `ExcelNumberFormat` | Built-in format ID to name |
| `convertNumFmtCodeToName(code)` | `ExcelNumberFormat` | Format code string to name |
| `convertNumFmtNameToId(name)` | `number` | Format name to built-in ID |

---

### Types

```typescript
/** Supported cell value types */
type ExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;

/** Number format names */
type ExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";

/** Cell address (0-based) */
interface ExcelAddressPoint { r: number; c: number; }

/** Range address (0-based) */
interface ExcelAddressRangePoint { s: ExcelAddressPoint; e: ExcelAddressPoint; }

/** Cell style options */
interface ExcelStyleOptions {
  background?: string;                   // ARGB hex (e.g. "00FF0000")
  border?: ExcelBorderPosition[];        // "left" | "right" | "top" | "bottom"
  horizontalAlign?: ExcelHorizontalAlign; // "left" | "center" | "right"
  verticalAlign?: ExcelVerticalAlign;     // "top" | "center" | "bottom"
  numberFormat?: ExcelNumberFormat;
}

type ExcelBorderPosition = "left" | "right" | "top" | "bottom";
type ExcelHorizontalAlign = "center" | "left" | "right";
type ExcelVerticalAlign = "center" | "top" | "bottom";
```
