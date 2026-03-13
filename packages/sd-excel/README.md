# @simplysm/sd-excel

Excel (.xlsx) read/write module built on top of the Open XML format. Provides a high-level workbook/worksheet/cell API for creating and reading Excel files, plus a legacy reader powered by [SheetJS](https://sheetjs.com/).

## Installation

```bash
npm install @simplysm/sd-excel
# or
yarn add @simplysm/sd-excel
```

## Quick Start

### Create a new workbook

```typescript
import { SdExcelWorkbook } from "@simplysm/sd-excel";

const wb = new SdExcelWorkbook();
const ws = await wb.createWorksheetAsync("Sheet1");

await ws.cell(0, 0).setValAsync("Name");
await ws.cell(0, 1).setValAsync("Age");
await ws.cell(1, 0).setValAsync("Alice");
await ws.cell(1, 1).setValAsync(30);

const buffer = await wb.getBufferAsync();
```

### Read an existing workbook

```typescript
import { SdExcelWorkbook } from "@simplysm/sd-excel";

const wb = new SdExcelWorkbook(buffer); // Buffer or Blob
const ws = await wb.getWorksheetAsync(0); // by index
// or: await wb.getWorksheetAsync("Sheet1"); // by name

const value = await ws.cell(0, 0).getValAsync();
```

## API Reference

### `SdExcelWorkbook`

Top-level class representing an Excel workbook (.xlsx). Can be created empty or loaded from a `Buffer` / `Blob`.

#### Constructor

```typescript
new SdExcelWorkbook();           // create empty workbook
new SdExcelWorkbook(data);       // load from Buffer or Blob
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getWorksheetNames` | `() => Promise<string[]>` | Get all worksheet names |
| `createWorksheetAsync` | `(name: string) => Promise<SdExcelWorksheet>` | Create a new worksheet |
| `getWorksheetAsync` | `(nameOrIndex: string \| number) => Promise<SdExcelWorksheet>` | Get a worksheet by name or 0-based index |
| `addMediaAsync` | `(buffer: Buffer, ext: string) => Promise<string>` | Add a media file (image) to the workbook. Returns the internal media path |
| `getBufferAsync` | `() => Promise<Buffer>` | Serialize the workbook to a Buffer |
| `getBlobAsync` | `() => Promise<Blob>` | Serialize the workbook to a Blob |
| `closeAsync` | `() => Promise<void>` | Release internal zip resources |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `zipCache` | `ZipCache` | Internal zip cache (advanced use) |

---

### `SdExcelWorksheet`

Represents a single worksheet within a workbook. Provides cell, row, and column access plus bulk data operations.

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getNameAsync` | `() => Promise<string>` | Get the worksheet name |
| `setNameAsync` | `(newName: string) => Promise<void>` | Rename the worksheet |
| `cell` | `(r: number, c: number) => SdExcelCell` | Get a cell by 0-based row and column |
| `row` | `(r: number) => SdExcelRow` | Get a row by 0-based index |
| `col` | `(c: number) => SdExcelCol` | Get a column by 0-based index |
| `getRangeAsync` | `() => Promise<ISdExcelAddressRangePoint>` | Get the used range of the worksheet |
| `getCellsAsync` | `() => Promise<SdExcelCell[][]>` | Get all cells as a 2D array |
| `getDataTableAsync` | `(opt?) => Promise<Record<string, any>[]>` | Read data as an array of header-keyed records |
| `setDataMatrixAsync` | `(matrix: TSdExcelValueType[][]) => Promise<void>` | Write a 2D array of values starting at (0, 0) |
| `setRecords` | `(records: Record<string, any>[]) => Promise<void>` | Write records with auto-generated headers |
| `copyRowAsync` | `(srcR: number, targetR: number) => Promise<void>` | Copy an entire row (values + styles + merge cells) |
| `copyCellAsync` | `(srcAddr, targetAddr) => Promise<void>` | Copy a single cell |
| `copyRowStyleAsync` | `(srcR: number, targetR: number) => Promise<void>` | Copy only styles from one row to another |
| `copyCellStyleAsync` | `(srcAddr, targetAddr) => Promise<void>` | Copy only the style from one cell to another |
| `insertEmptyRowAsync` | `(row: number) => Promise<void>` | Insert an empty row, shifting existing rows down |
| `insertCopyRowAsync` | `(srcR: number, targetR: number) => Promise<void>` | Insert a row and copy the source row into it |
| `setZoomAsync` | `(percent: number) => Promise<void>` | Set the worksheet zoom level |
| `setFixAsync` | `(point: { r?: number; c?: number }) => Promise<void>` | Freeze panes at the given row/column |
| `addImageAsync` | `(opts) => Promise<void>` | Add an image using two-cell anchor positioning |
| `addDrawingAsync` | `(opts) => Promise<void>` | Add an image using one-cell anchor positioning with pixel dimensions |

#### `getDataTableAsync` Options

| Option | Type | Description |
|--------|------|-------------|
| `headerRowIndex` | `number` | Row index to use as header (defaults to first data row) |
| `checkEndColIndex` | `number` | Column index to check for empty values to stop reading |
| `usableHeaderNameFn` | `(name: string) => boolean` | Filter function for header names |

#### `addImageAsync` Options

| Option | Type | Description |
|--------|------|-------------|
| `buffer` | `Buffer` | Image data |
| `ext` | `string` | File extension (e.g. `"png"`) |
| `from` | `{ r, c, rOff?, cOff? }` | Top-left anchor cell and offsets |
| `to` | `{ r, c, rOff?, cOff? }` | Bottom-right anchor cell and offsets (defaults to one cell down-right from `from`) |

#### `addDrawingAsync` Options

| Option | Type | Description |
|--------|------|-------------|
| `buffer` | `Buffer` | Image data |
| `ext` | `string` | File extension (e.g. `"png"`) |
| `r` | `number` | Anchor row (0-based) |
| `c` | `number` | Anchor column (0-based) |
| `width` | `number` | Image width in pixels |
| `height` | `number` | Image height in pixels |
| `left` | `number` | Horizontal offset in pixels |
| `top` | `number` | Vertical offset in pixels |

---

### `SdExcelCell`

Represents a single cell. Provides value read/write and style operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `addr` | `{ r: number; c: number }` | The cell address (0-based) |
| `style` | `object` | Style setter object (see below) |

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getValAsync` | `() => Promise<TSdExcelValueType>` | Read the cell value. Returns `number`, `string`, `DateOnly`, `DateTime`, `Time`, `boolean`, or `undefined` |
| `setValAsync` | `(val: TSdExcelValueType) => Promise<void>` | Write a value. Passing `undefined` clears the cell |
| `setFormulaAsync` | `(val: string \| undefined) => Promise<void>` | Set or clear a cell formula |
| `mergeAsync` | `(r: number, c: number) => Promise<void>` | Merge from this cell to the given end address |
| `getStyleIdAsync` | `() => Promise<string \| undefined>` | Get the internal style ID |
| `setStyleIdAsync` | `(styleId: string \| undefined) => Promise<void>` | Set the internal style ID directly |

#### `style` Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setBackgroundAsync` | `(color: string) => Promise<void>` | Set background color (format: `"AARRGGBB"`, e.g. `"00FFFF00"`) |
| `setBorderAsync` | `(directions: ("left" \| "right" \| "top" \| "bottom")[]) => Promise<void>` | Set thin borders on specified sides |
| `setVerticalAlignAsync` | `(align: "center" \| "top" \| "bottom") => Promise<void>` | Set vertical alignment |
| `setHorizontalAlignAsync` | `(align: "center" \| "left" \| "right") => Promise<void>` | Set horizontal alignment |
| `setFormatPresetAsync` | `(format) => Promise<void>` | Set a number format preset (`"number"`, `"string"`, `"DateOnly"`, `"DateTime"`, `"Time"`, `"ThousandsSeparator"`, `"0%"`, `"0.00%"`) |
| `setNumFormatIdAsync` | `(numFmtId: string) => Promise<void>` | Set a raw number format ID |
| `setNumFormatCodeAsync` | `(numFmtCode: string) => Promise<void>` | Set a custom number format code string |

---

### `SdExcelRow`

Represents a row in a worksheet.

| Method | Signature | Description |
|--------|-----------|-------------|
| `cell` | `(c: number) => SdExcelCell` | Get a cell by 0-based column index |
| `getCellsAsync` | `() => Promise<SdExcelCell[]>` | Get all cells in the row within the used range |

---

### `SdExcelCol`

Represents a column in a worksheet.

| Method | Signature | Description |
|--------|-----------|-------------|
| `cell` | `(r: number) => SdExcelCell` | Get a cell by 0-based row index |
| `getCellsAsync` | `() => Promise<SdExcelCell[]>` | Get all cells in the column within the used range |
| `setWidthAsync` | `(size: number) => Promise<void>` | Set the column width |

---

### `SdExcelWrapper<VT>`

High-level helper for schema-driven Excel read/write. Define a field configuration that maps object keys to display names and types, then use `writeAsync` / `readAsync` for type-safe Excel I/O with automatic validation.

#### Constructor

```typescript
new SdExcelWrapper(fieldConf, additionalFieldConf?)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fieldConf` | `VT \| () => VT` | Field configuration object or factory. Each key maps to `{ displayName, type, notnull?, includes?, hidden? }` |
| `additionalFieldConf` | `(item) => Partial<VT>` | Optional per-item field overrides |

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `writeAsync` | `(wsName: string, items: Partial<Record>[]) => Promise<SdExcelWorkbook>` | Create a workbook from records. Applies borders to all cells, highlights required columns in yellow, sets zoom to 85%, and freezes the header row |
| `readAsync` | `(file: Buffer \| Blob, wsNameOrIndex?: string \| number) => Promise<Record[]>` | Read and validate records from an Excel file. Performs automatic type coercion for `String`, `Number`, `Boolean`, `DateOnly`, and `DateTime` fields |

#### Field Configuration (`TExcelValidObject`)

```typescript
const fieldConf = {
  name: { displayName: "Name", type: String, notnull: true },
  age: { displayName: "Age", type: Number },
  birthDate: { displayName: "Birth Date", type: DateOnly },
  isActive: { displayName: "Active", type: Boolean, notnull: true },
};
```

| Property | Type | Description |
|----------|------|-------------|
| `displayName` | `string` | Column header text in the Excel file |
| `type` | `Type<any>` | Value type constructor (`String`, `Number`, `Boolean`, `DateOnly`, `DateTime`, etc.) |
| `notnull` | `boolean` | If `true`, the field is required. The first notnull field is used to detect end-of-data |
| `includes` | `any[]` | Allowed values (for validation) |
| `hidden` | `boolean` | If `true`, the field is excluded from read operations |

---

### `SdExcelUtils`

Static utility class for address conversion and number format handling.

| Method | Signature | Description |
|--------|-----------|-------------|
| `stringifyAddr` | `(point: { r, c }) => string` | Convert 0-based `{ r, c }` to Excel address (e.g. `"A1"`) |
| `stringifyRowAddr` | `(r: number) => string` | Convert 0-based row to 1-based string |
| `stringifyColAddr` | `(c: number) => string` | Convert 0-based column to letter(s) (e.g. `0 => "A"`, `27 => "AB"`) |
| `parseCellAddrCode` | `(addr: string) => { r, c }` | Parse an address string like `"B3"` to 0-based `{ r, c }` |
| `parseRowAddrCode` | `(addrCode: string) => number` | Parse the row part of an address to 0-based index |
| `parseColAddrCode` | `(addrCode: string) => number` | Parse the column part of an address to 0-based index |
| `parseRangeAddrCode` | `(rangeAddr: string) => { s, e }` | Parse a range string like `"A1:C3"` to start/end points |
| `stringifyRangeAddr` | `(point: { s, e }) => string` | Convert start/end points to range string |
| `convertTimeTickToNumber` | `(tick: number) => number` | Convert a JS timestamp to an Excel date number |
| `convertNumberToTimeTick` | `(num: number) => number` | Convert an Excel date number to a JS timestamp |
| `convertNumFmtIdToName` | `(numFmtId: number) => TSdExcelNumberFormat` | Map a number format ID to a format name |
| `convertNumFmtCodeToName` | `(numFmtCode: string) => TSdExcelNumberFormat` | Map a format code string to a format name |
| `convertNumFmtNameToId` | `(numFmtName: TSdExcelNumberFormat) => number` | Map a format name to a number format ID |

---

### `ZipCache`

Internal caching layer over `SdZip` that lazily parses XML entries from the .xlsx archive. Used by `SdExcelWorkbook`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `getAsync` | `(filePath: string) => Promise<ISdExcelXml \| Buffer \| undefined>` | Get a parsed XML object or raw Buffer from the archive |
| `existsAsync` | `(filePath: string) => Promise<boolean>` | Check if a file exists in the archive |
| `set` | `(filePath: string, content: ISdExcelXml \| Buffer) => void` | Set or overwrite a file in the cache |
| `toBufferAsync` | `() => Promise<Buffer>` | Serialize all cached changes back to a .xlsx Buffer |
| `closeAsync` | `() => Promise<void>` | Release resources |

---

### Types

#### `TSdExcelValueType`

```typescript
type TSdExcelValueType = number | string | DateOnly | DateTime | Time | boolean | undefined;
```

Union of all supported cell value types. `DateOnly`, `DateTime`, and `Time` come from `@simplysm/sd-core-common`.

#### `TSdExcelNumberFormat`

```typescript
type TSdExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";
```

#### `ISdExcelAddressPoint`

```typescript
interface ISdExcelAddressPoint { r: number; c: number; }
```

#### `ISdExcelAddressRangePoint`

```typescript
interface ISdExcelAddressRangePoint { s: ISdExcelAddressPoint; e: ISdExcelAddressPoint; }
```

#### `ISdExcelStyle`

```typescript
interface ISdExcelStyle {
  numFmtId?: string;
  numFmtCode?: string;
  border?: ("left" | "right" | "top" | "bottom")[];
  background?: string;
  verticalAlign?: "center" | "top" | "bottom";
  horizontalAlign?: "center" | "left" | "right";
}
```

---

### Legacy API (`SdExcelReader`)

Read-only Excel reader powered by SheetJS. Useful for reading files with codepage 949 (Korean) encoding.

#### `SdExcelReader`

```typescript
const reader = new SdExcelReader(buffer);
```

| Property/Method | Signature | Description |
|-----------------|-----------|-------------|
| `sheetNames` | `string[]` | List of sheet names |
| `getWorkSheet` | `(name: string) => SdExcelReaderWorksheet` | Get worksheet by name |
| `getWorkSheet` | `(index: number) => SdExcelReaderWorksheet` | Get worksheet by index |

#### `SdExcelReaderWorksheet`

| Property/Method | Signature | Description |
|-----------------|-----------|-------------|
| `range` | `XLSX.Range` | Used range of the worksheet |
| `val` | `(r: number, c: number) => string \| number \| boolean \| Date \| undefined` | Read a cell value by 0-based row and column |
| `dataTable` | `(startRow?, startCol?, endRow?, endCol?) => SdExcelReaderDataTable` | Create a data table view. Negative values are relative to range boundaries |

#### `SdExcelReaderDataTable`

| Property/Method | Signature | Description |
|-----------------|-----------|-------------|
| `rowLength` | `number` | Number of data rows (excluding header) |
| `headers` | `(string \| undefined)[]` | Header names indexed by column |
| `val` | `(r: number, colName: string) => any` | Get a value by 0-based data row and header name |
| `map` | `(cb: (r) => R, filterCb?) => R[]` | Map over rows with optional filter |
| `mapMany` | `(cb: (r) => R[], filterCb?) => R[]` | FlatMap over rows with optional filter |

## Usage Examples

### Write records with SdExcelWrapper

```typescript
import { SdExcelWrapper } from "@simplysm/sd-excel";
import { DateOnly } from "@simplysm/sd-core-common";

const wrapper = new SdExcelWrapper({
  name: { displayName: "Name", type: String, notnull: true },
  age: { displayName: "Age", type: Number },
  joinDate: { displayName: "Join Date", type: DateOnly },
});

const wb = await wrapper.writeAsync("Employees", [
  { name: "Alice", age: 30, joinDate: new DateOnly(2025, 1, 15) },
  { name: "Bob", age: 25 },
]);

const buffer = await wb.getBufferAsync();
```

### Read and validate records with SdExcelWrapper

```typescript
const records = await wrapper.readAsync(buffer, "Employees");
// records: { name: string; age?: number; joinDate?: DateOnly }[]
```

### Style cells

```typescript
const ws = await wb.createWorksheetAsync("Styled");

await ws.cell(0, 0).setValAsync("Header");
await ws.cell(0, 0).style.setBackgroundAsync("00FFFF00"); // yellow
await ws.cell(0, 0).style.setBorderAsync(["left", "right", "top", "bottom"]);
await ws.cell(0, 0).style.setHorizontalAlignAsync("center");
await ws.cell(0, 0).style.setFormatPresetAsync("ThousandsSeparator");
```

### Merge cells

```typescript
await ws.cell(0, 0).setValAsync("Merged");
await ws.cell(0, 0).mergeAsync(1, 2); // merge from (0,0) to (1,2)
```

### Freeze panes and set zoom

```typescript
await ws.setZoomAsync(85);
await ws.setFixAsync({ r: 0 });       // freeze top row
await ws.setFixAsync({ c: 0 });       // freeze first column
await ws.setFixAsync({ r: 0, c: 1 }); // freeze row 0 and column 0-1
```

### Add an image

```typescript
import * as fs from "fs";

const imgBuffer = fs.readFileSync("logo.png");
await ws.addImageAsync({
  buffer: imgBuffer,
  ext: "png",
  from: { r: 0, c: 0 },
  to: { r: 5, c: 3 },
});
```

### Insert and copy rows

```typescript
await ws.insertEmptyRowAsync(2);           // insert empty row at index 2
await ws.insertCopyRowAsync(0, 3);         // copy row 0 and insert at row 3
await ws.copyRowAsync(1, 5);              // copy row 1 to row 5
```

### Read with the legacy SdExcelReader

```typescript
import { SdExcelReader } from "@simplysm/sd-excel";

const reader = new SdExcelReader(buffer);
const ws = reader.getWorkSheet(0);
const dt = ws.dataTable();

const rows = dt.map((r) => ({
  name: dt.val(r, "Name"),
  age: dt.val(r, "Age"),
}));
```
