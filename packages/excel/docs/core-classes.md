# Core Classes

## ExcelWorkbook

Excel workbook processing class. Internally manages ZIP resources.

Adopts a Lazy Loading architecture for memory efficiency with large Excel files: XML inside the ZIP is read and parsed only at the point of access.

```typescript
import { ExcelWorkbook } from "@simplysm/excel";
```

### Constructor

```typescript
constructor(arg?: Blob | Bytes)
```

- `arg` -- Existing Excel file data (Blob or Uint8Array). Creates a new workbook if omitted.

### Methods

#### `getWorksheetNames`

Return all worksheet names in the workbook.

```typescript
async getWorksheetNames(): Promise<string[]>;
```

#### `addWorksheet`

Create and return a new worksheet.

```typescript
async addWorksheet(name: string): Promise<ExcelWorksheet>;
```

#### `getWorksheet`

Look up a worksheet by name or index (0-based).

```typescript
async getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>;
```

#### `toBytes`

Export workbook as byte array.

```typescript
async toBytes(): Promise<Bytes>;
```

#### `toBlob`

Export workbook as Blob.

```typescript
async toBlob(): Promise<Blob>;
```

#### `close`

Release workbook resources. Safe to call on an already closed workbook (no-op). The workbook instance cannot be used after this call.

```typescript
async close(): Promise<void>;
```

Implements `Symbol.asyncDispose` for use with `await using`.

### Example

```typescript
// Using await using (recommended)
await using wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);
// Resources automatically released at scope exit

// Or using try-finally
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
} finally {
  await wb.close();
}
```

---

## ExcelWorksheet

Class representing an Excel worksheet. Provides cell access, row/column copying, data table processing, and image insertion.

### Cell Access

#### `row`

Return row object (0-based).

```typescript
row(r: number): ExcelRow;
```

#### `cell`

Return cell object (0-based row/column).

```typescript
cell(r: number, c: number): ExcelCell;
```

#### `col`

Return column object (0-based).

```typescript
col(c: number): ExcelCol;
```

### Name Methods

#### `getName`

```typescript
async getName(): Promise<string>;
```

#### `setName`

```typescript
async setName(newName: string): Promise<void>;
```

### Copy Methods

#### `copyRowStyle`

Copy style from source row to target row.

```typescript
async copyRowStyle(srcR: number, targetR: number): Promise<void>;
```

#### `copyCellStyle`

Copy style from source cell to target cell.

```typescript
async copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>;
```

#### `copyRow`

Copy source row to target row (overwrite).

```typescript
async copyRow(srcR: number, targetR: number): Promise<void>;
```

#### `copyCell`

Copy source cell to target cell.

```typescript
async copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>;
```

#### `insertCopyRow`

Insert-copy the source row at the target position. Existing rows at and below the target are shifted down by one.

```typescript
async insertCopyRow(srcR: number, targetR: number): Promise<void>;
```

### Range Methods

#### `getRange`

Return data range of the worksheet.

```typescript
async getRange(): Promise<ExcelAddressRangePoint>;
```

#### `getCells`

Return all cells as a 2D array.

```typescript
async getCells(): Promise<ExcelCell[][]>;
```

### Data Methods

#### `getDataTable`

Return worksheet data as a table (record array).

```typescript
async getDataTable(opt?: {
  headerRowIndex?: number;
  checkEndColIndex?: number;
  usableHeaderNameFn?: (headerName: string) => boolean;
}): Promise<Record<string, ExcelValueType>[]>;
```

**Parameters:**
- `opt.headerRowIndex` -- Header row index (default: first row)
- `opt.checkEndColIndex` -- Column index to determine data end. Data ends when this column is empty.
- `opt.usableHeaderNameFn` -- Function to filter usable headers

#### `setDataMatrix`

Write 2D array data to the worksheet.

```typescript
async setDataMatrix(matrix: ExcelValueType[][]): Promise<void>;
```

#### `setRecords`

Write record array to the worksheet. Headers are auto-generated in the first row, data follows in subsequent rows.

```typescript
async setRecords(records: Record<string, ExcelValueType>[]): Promise<void>;
```

### View Methods

#### `setZoom`

Set worksheet zoom scale (percent).

```typescript
async setZoom(percent: number): Promise<void>;
```

#### `freezeAt`

Set freeze panes for rows/columns.

```typescript
async freezeAt(point: { r?: number; c?: number }): Promise<void>;
```

### Image Methods

#### `addImage`

Insert an image into the worksheet.

```typescript
async addImage(opts: {
  bytes: Bytes;
  ext: string;
  from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
}): Promise<void>;
```

**Parameters:**
- `opts.bytes` -- Image binary data
- `opts.ext` -- Image extension (png, jpg, etc.)
- `opts.from` -- Image start position (0-based row/column index, rOff/cOff in EMU offset)
- `opts.to` -- Image end position (if omitted, inserted at from position with original size)

---

## ExcelRow

Class representing a row in an Excel worksheet. Provides cell access functionality.

#### `cell`

Return cell at the given column index (0-based).

```typescript
cell(c: number): ExcelCell;
```

#### `getCells`

Return all cells in the row.

```typescript
async getCells(): Promise<ExcelCell[]>;
```

---

## ExcelCol

Class representing a column in an Excel worksheet. Provides cell access and column width configuration.

#### `cell`

Return cell at the given row index (0-based).

```typescript
cell(r: number): ExcelCell;
```

#### `getCells`

Return all cells in the column.

```typescript
async getCells(): Promise<ExcelCell[]>;
```

#### `setWidth`

Set column width.

```typescript
async setWidth(size: number): Promise<void>;
```

---

## ExcelCell

Class representing an Excel cell. Provides value read/write, formula, style, and cell merge functionality.

All cell methods are `async` because the required XML (SharedStrings, Styles, etc.) is loaded on-demand for memory efficiency.

### Properties

#### `addr`

Cell address (0-based row/column index).

```typescript
readonly addr: ExcelAddressPoint;
```

### Value Methods

#### `getValue`

Return cell value.

```typescript
async getValue(): Promise<ExcelValueType>;
```

#### `setValue`

Set cell value (`undefined` deletes the cell).

```typescript
async setValue(val: ExcelValueType): Promise<void>;
```

#### `getFormula`

Return cell formula.

```typescript
async getFormula(): Promise<string | undefined>;
```

#### `setFormula`

Set formula on cell (`undefined` removes the formula).

```typescript
async setFormula(val: string | undefined): Promise<void>;
```

### Merge Methods

#### `merge`

Merge cells from current cell to the specified end coordinates.

```typescript
async merge(r: number, c: number): Promise<void>;
```

**Example:**
```typescript
// Merges range A1:C3 (3 rows x 3 columns)
await ws.cell(0, 0).merge(2, 2);
```

### Style Methods

#### `getStyleId`

Return cell style ID.

```typescript
async getStyleId(): Promise<string | undefined>;
```

#### `setStyleId`

Set cell style ID.

```typescript
async setStyleId(styleId: string | undefined): Promise<void>;
```

#### `setStyle`

Set cell style.

```typescript
async setStyle(opts: ExcelStyleOptions): Promise<void>;
```

---

## ExcelUtils

Collection of Excel utility functions. Provides cell address conversion, date/number conversion, and number format processing.

```typescript
import { ExcelUtils } from "@simplysm/excel";
```

### Address Conversion

#### `stringifyAddr`

Convert cell coordinates to "A1" format string.

```typescript
static stringifyAddr(point: ExcelAddressPoint): string;
```

#### `stringifyRowAddr`

Convert row index (0-based) to row address string (e.g. `0` -> `"1"`).

```typescript
static stringifyRowAddr(r: number): string;
```

#### `stringifyColAddr`

Convert column index (0-based) to column address string (e.g. `0` -> `"A"`, `26` -> `"AA"`).

```typescript
static stringifyColAddr(c: number): string;
```

#### `parseRowAddr`

Extract row index from cell address (e.g. `"A3"` -> `2`).

```typescript
static parseRowAddr(addr: string): number;
```

#### `parseColAddr`

Extract column index from cell address (e.g. `"B3"` -> `1`).

```typescript
static parseColAddr(addr: string): number;
```

#### `parseCellAddr`

Convert cell address to coordinates (e.g. `"B3"` -> `{r: 2, c: 1}`).

```typescript
static parseCellAddr(addr: string): ExcelAddressPoint;
```

#### `parseRangeAddr`

Convert range address to coordinates (e.g. `"A1:C3"` -> `{s: {r:0,c:0}, e: {r:2,c:2}}`).

```typescript
static parseRangeAddr(rangeAddr: string): ExcelAddressRangePoint;
```

#### `stringifyRangeAddr`

Convert range coordinates to address string.

```typescript
static stringifyRangeAddr(point: ExcelAddressRangePoint): string;
```

### Date/Number Conversion

#### `convertTimeTickToNumber`

Convert JavaScript timestamp (ms) to Excel date number. Excel counts 1900-01-01 as 1 (1899-12-30 is date 0).

```typescript
static convertTimeTickToNumber(tick: number): number;
```

#### `convertNumberToTimeTick`

Convert Excel date number to JavaScript timestamp (ms).

```typescript
static convertNumberToTimeTick(value: number): number;
```

### Number Format

#### `convertNumFmtCodeToName`

Convert number format code to format name.

```typescript
static convertNumFmtCodeToName(numFmtCode: string): ExcelNumberFormat;
```

#### `convertNumFmtIdToName`

Convert number format ID to format name.

```typescript
static convertNumFmtIdToName(numFmtId: number): ExcelNumberFormat;
```

Built-in format ID ranges:
- `0-13, 37-40, 48`: number/general/currency/percent formats
- `14-17, 27-31, 34-36, 50-58`: date formats (including localized)
- `22`: date+time format
- `18-21, 32-33, 45-47`: time formats
- `49`: text format

#### `convertNumFmtNameToId`

Convert number format name to format ID.

```typescript
static convertNumFmtNameToId(numFmtName: ExcelNumberFormat): number;
```
