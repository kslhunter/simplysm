# @simplysm/sd-excel

Simplysm package — Excel (.xlsx) read/write module. Supports creating workbooks from scratch, reading existing files (Buffer or Blob), writing cell values, applying styles, merging cells, adding images, and a high-level wrapper for typed record import/export.

## Installation

```bash
yarn add @simplysm/sd-excel
```

## Main Modules

### Core API (SdExcelWorkbook / SdExcelWorksheet / SdExcelRow / SdExcelCol / SdExcelCell)

The primary API for creating and reading `.xlsx` files.

---

#### `SdExcelWorkbook`

Top-level entry point. Represents an entire Excel workbook.

```typescript
import { SdExcelWorkbook } from "@simplysm/sd-excel";

// Create a new, empty workbook
const wb = new SdExcelWorkbook();

// Open an existing file (Node.js Buffer or browser Blob)
const wb = new SdExcelWorkbook(buffer);
const wb = new SdExcelWorkbook(blob);
```

**Constructor**

```typescript
constructor(arg?: Blob | Buffer)
```

**Properties**

| Property   | Type       | Description                                           |
| ---------- | ---------- | ----------------------------------------------------- |
| `zipCache` | `ZipCache` | Internal ZIP cache. Can be used for low-level access. |

**Methods**

```typescript
// Get all worksheet names
getWorksheetNames(): Promise<string[]>

// Create and return a new worksheet
createWorksheetAsync(name: string): Promise<SdExcelWorksheet>

// Get an existing worksheet by name or 0-based index
getWorksheetAsync(nameOrIndex: string | number): Promise<SdExcelWorksheet>

// Add a media file (image) to the workbook-level media store.
// Returns the stored media path (e.g. "xl/media/image1.png").
addMediaAsync(buffer: Buffer, ext: string): Promise<string>

// Serialize to a Node.js Buffer
getBufferAsync(): Promise<Buffer>

// Serialize to a browser Blob (MIME: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
getBlobAsync(): Promise<Blob>

// Release ZIP resources
closeAsync(): Promise<void>
```

**Example — create and save**

```typescript
import { SdExcelWorkbook } from "@simplysm/sd-excel";
import * as fs from "fs";

const wb = new SdExcelWorkbook();
const ws = await wb.createWorksheetAsync("Sheet1");
await ws.cell(0, 0).setValAsync("Hello");
const buffer = await wb.getBufferAsync();
fs.writeFileSync("output.xlsx", buffer);
await wb.closeAsync();
```

---

#### `SdExcelWorksheet`

Represents a single worksheet within a workbook.

```typescript
import { SdExcelWorksheet } from "@simplysm/sd-excel";
// Obtained via SdExcelWorkbook.createWorksheetAsync / getWorksheetAsync
```

**Methods**

```typescript
// Get the worksheet's display name
getNameAsync(): Promise<string>

// Rename the worksheet
setNameAsync(newName: string): Promise<void>

// Get a row accessor (0-based row index)
row(r: number): SdExcelRow

// Get a cell accessor directly (0-based row and column indices)
cell(r: number, c: number): SdExcelCell

// Get a column accessor (0-based column index)
col(c: number): SdExcelCol

// Get all cells as a 2-D array [row][col]
getCellsAsync(): Promise<SdExcelCell[][]>

// Get the used range. The start point s is always { r: 0, c: 0 }.
// The end point e reflects the highest row/column index that contains data.
getRangeAsync(): Promise<ISdExcelAddressRangePoint>

// Read data as an array of plain objects keyed by header row values
getDataTableAsync(opt?: {
  headerRowIndex?: number;           // default: first row of used range (row 0)
  checkEndColIndex?: number;         // stop reading rows when this column is empty
  usableHeaderNameFn?: (headerName: string) => boolean;
}): Promise<Record<string, any>[]>

// Write a 2-D matrix of values starting at cell (0, 0)
setDataMatrixAsync(matrix: TSdExcelValueType[][]): Promise<void>

// Write an array of plain records (first row becomes the header)
setRecords(records: Record<string, any>[]): Promise<void>

// Copy the style of every cell in srcR to targetR
copyRowStyleAsync(srcR: number, targetR: number): Promise<void>

// Copy the style of a single cell
copyCellStyleAsync(
  srcAddr: { r: number; c: number },
  targetAddr: { r: number; c: number }
): Promise<void>

// Copy the entire contents of a row (data + styles + merge cells)
copyRowAsync(srcR: number, targetR: number): Promise<void>

// Copy the entire contents of a single cell
copyCellAsync(
  srcAddr: { r: number; c: number },
  targetAddr: { r: number; c: number }
): Promise<void>

// Shift all rows at or below `row` downward by one and insert a blank row
insertEmptyRowAsync(row: number): Promise<void>

// Insert a copy of srcR at targetR (shifts existing rows then copies)
insertCopyRowAsync(srcR: number, targetR: number): Promise<void>

// Set the view zoom level (percent, e.g. 85 for 85%)
setZoomAsync(percent: number): Promise<void>

// Freeze panes at the given row/column split point
setFixAsync(point: { r?: number; c?: number }): Promise<void>

// Add an image anchored to a two-cell range
addImageAsync(opts: {
  buffer: Buffer;
  ext: string;                        // file extension, e.g. "png"
  from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
}): Promise<void>

// Add an image anchored to a single cell with explicit pixel dimensions
addDrawingAsync(opts: {
  buffer: Buffer;
  ext: string;
  r: number;
  c: number;
  width: number;   // pixels (converted to EMU internally: × 9525)
  height: number;  // pixels
  left?: number;   // horizontal offset in pixels
  top?: number;    // vertical offset in pixels
}): Promise<void>
```

**Example — read data table**

```typescript
const ws = await wb.getWorksheetAsync(0);
const rows = await ws.getDataTableAsync({ headerRowIndex: 0 });
// rows: [{ "Name": "Alice", "Age": 30 }, ...]
```

---

#### `SdExcelRow`

Represents a single row in a worksheet. Obtained via `SdExcelWorksheet.row(r)`.

**Methods**

```typescript
// Get a cell accessor for the given 0-based column index
cell(c: number): SdExcelCell

// Get all cells in this row that fall within the worksheet's used range
getCellsAsync(): Promise<SdExcelCell[]>
```

---

#### `SdExcelCol`

Represents a single column in a worksheet. Obtained via `SdExcelWorksheet.col(c)`.

**Methods**

```typescript
// Get a cell accessor for the given 0-based row index
cell(r: number): SdExcelCell

// Get all cells in this column that fall within the worksheet's used range
getCellsAsync(): Promise<SdExcelCell[]>

// Set the column width (in character units, same as Excel's column width)
setWidthAsync(size: number): Promise<void>
```

---

#### `SdExcelCell`

Represents a single cell. Obtained via `SdExcelWorksheet.cell(r, c)`, `SdExcelRow.cell(c)`, or `SdExcelCol.cell(r)`.

**Properties**

| Property | Type                       | Description                                 |
| -------- | -------------------------- | ------------------------------------------- |
| `addr`   | `{ r: number; c: number }` | 0-based row/column address of the cell.     |
| `style`  | object                     | Style helper — see style sub-methods below. |

**Methods**

```typescript
// Read the cell value; returns undefined for empty cells
getValAsync(): Promise<TSdExcelValueType>

// Write a value (string, number, boolean, DateOnly, DateTime, Time, or undefined to clear)
setValAsync(val: TSdExcelValueType): Promise<void>

// Write a formula string (e.g. "SUM(A1:A10)"); undefined clears the formula
setFormulaAsync(val: string | undefined): Promise<void>

// Merge this cell with the cell at (r, c)
mergeAsync(r: number, c: number): Promise<void>

// Read the internal style ID
getStyleIdAsync(): Promise<string | undefined>

// Apply an existing style ID to this cell
setStyleIdAsync(styleId: string | undefined): Promise<void>
```

**Style sub-methods (`cell.style.*`)**

```typescript
// Set the background fill color.
// color format: 8-char hex string "AARRGGBB" (alpha-inverted + RGB), e.g. "00FFFF00" = yellow
style.setBackgroundAsync(color: string): Promise<void>

// Apply thin borders on the specified sides
style.setBorderAsync(directions: ("left" | "right" | "top" | "bottom")[]): Promise<void>

// Set vertical alignment
style.setVerticalAlignAsync(align: "center" | "top" | "bottom"): Promise<void>

// Set horizontal alignment
style.setHorizontalAlignAsync(align: "center" | "left" | "right"): Promise<void>

// Apply a named format preset
// Presets: TSdExcelNumberFormat values plus "ThousandsSeparator", "0%", "0.00%"
style.setFormatPresetAsync(
  format: TSdExcelNumberFormat | "ThousandsSeparator" | "0%" | "0.00%"
): Promise<void>

// Apply a raw OOXML numFmtId string (e.g. "14" for short date)
style.setNumFormatIdAsync(numFmtId: string): Promise<void>

// Apply a custom number format code (e.g. "#,##0.00")
style.setNumFormatCodeAsync(numFmtCode: string): Promise<void>
```

**Example — write values and apply styles**

```typescript
const cell = ws.cell(0, 0);
await cell.setValAsync("Hello World");
await cell.style.setBackgroundAsync("00FFFF00"); // yellow
await cell.style.setBorderAsync(["left", "right", "top", "bottom"]);
await cell.style.setHorizontalAlignAsync("center");
```

---

### High-level Wrapper (SdExcelWrapper)

`SdExcelWrapper` provides a typed read/write API driven by a field configuration object. It handles header mapping, type coercion, and basic validation automatically.

```typescript
import { SdExcelWrapper } from "@simplysm/sd-excel";
import { DateOnly } from "@simplysm/sd-core-common";

const wrapper = new SdExcelWrapper({
  name: { displayName: "이름", type: String, notnull: true },
  age: { displayName: "나이", type: Number },
  joinDate: { displayName: "입사일", type: DateOnly },
});
```

**Constructor**

```typescript
constructor(
  fieldConf: VT | (() => VT),
  additionalFieldConf?: (item: TExcelValidateObjectRecord<VT>) => {
    [P in keyof VT]?: Partial<TValidFieldSpec<VT[P]["type"]>>;
  }
)
```

| Parameter             | Description                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `fieldConf`           | Field definition map or factory function. Keys are TypeScript property names; values are `TValidFieldSpec` objects. |
| `additionalFieldConf` | Optional per-row overrides (e.g. to dynamically hide columns or change validation).                                 |

**Methods**

```typescript
// Write records to a new workbook and return the workbook instance.
// Applies borders, highlights required (notnull, non-Boolean) columns in yellow,
// sets zoom to 85%, and freezes the header row.
writeAsync(
  wsName: string,
  items: Partial<TExcelValidateObjectRecord<VT>>[]
): Promise<SdExcelWorkbook>

// Read records from a Buffer or Blob.
// Validates that every "notnull" field is present; throws if no data rows are found.
readAsync(
  file: Buffer | Blob,
  wsNameOrIndex?: string | number  // default: 0
): Promise<TExcelValidateObjectRecord<VT>[]>
```

**Field spec (`TValidFieldSpec`)**

```typescript
{
  displayName: string;          // Column header text in the Excel file
  type: Type<any>;              // String | Number | Boolean | DateOnly | DateTime | ...
  notnull?: boolean;            // Required field — highlighted yellow on write, validated on read
  includes?: InstanceType<T>[]; // Allowed value list
  hidden?: boolean;             // Exclude this field when reading/writing
}
```

**Type aliases**

```typescript
// The record type inferred from a field config VT.
// Fields with notnull: true are required (non-optional); all others are optional.
type TExcelValidateObjectRecord<VT extends TExcelValidObject>

// A field config map type
type TExcelValidObject = Record<string, TValidFieldSpec<any>>
```

**Example — write then read**

```typescript
import { SdExcelWrapper } from "@simplysm/sd-excel";
import * as fs from "fs";

const wrapper = new SdExcelWrapper({
  name: { displayName: "Name", type: String, notnull: true },
  score: { displayName: "Score", type: Number },
});

// Write
const wb = await wrapper.writeAsync("Results", [
  { name: "Alice", score: 95 },
  { name: "Bob", score: 87 },
]);
fs.writeFileSync("results.xlsx", await wb.getBufferAsync());
await wb.closeAsync();

// Read
const file = fs.readFileSync("results.xlsx");
const records = await wrapper.readAsync(file);
// records: [{ name: "Alice", score: 95 }, { name: "Bob", score: 87 }]
```

---

### Legacy Reader (SdExcelReader / SdExcelReaderWorksheet / SdExcelReaderDataTable)

A simpler, synchronous-construction reader backed by the `xlsx` (SheetJS) library. Use the modern `SdExcelWorkbook` API for new code.

---

#### `SdExcelReader`

```typescript
import { SdExcelReader } from "@simplysm/sd-excel";

const reader = new SdExcelReader(buffer); // Buffer only
```

**Constructor**

```typescript
constructor(data: Buffer)
```

**Properties / Methods**

```typescript
// Names of all sheets in the workbook
get sheetNames(): string[]

// Get a worksheet by name or 0-based index
getWorkSheet(name: string): SdExcelReaderWorksheet
getWorkSheet(index: number): SdExcelReaderWorksheet
```

---

#### `SdExcelReaderWorksheet`

Obtained via `SdExcelReader.getWorkSheet(...)`.

**Methods**

```typescript
// The used cell range (raw xlsx Range object)
get range(): XLSX.Range

// Read a single cell value (0-based row and column indices)
val(r: number, c: number): string | number | boolean | Date | undefined

// Get a data table view over a sub-range.
// All parameters are 0-based absolute sheet indices; negative values are relative to the range end.
dataTable(
  startRow?: number,
  startCol?: number,
  endRow?: number,
  endCol?: number
): SdExcelReaderDataTable
```

---

#### `SdExcelReaderDataTable`

Obtained via `SdExcelReaderWorksheet.dataTable(...)`. The first row of the range is treated as the header.

**Properties**

```typescript
// Number of data rows (excluding the header row)
get rowLength(): number

// Header cell values (undefined for columns with no text header)
get headers(): (string | undefined)[]
```

**Methods**

```typescript
// Read a cell value by column header name.
// r must be the raw sheet row index as received from the map/mapMany callback.
val(r: number, colName: string): any

// Map over each data row.
// The callback receives the raw sheet row index; pass it directly to val().
// filterCb, when provided, skips rows where it returns false.
map<R>(cb: (r: number) => R, filterCb?: (r: number) => boolean): R[]

// FlatMap over each data row.
// The callback receives the raw sheet row index; pass it directly to val().
mapMany<R>(cb: (r: number) => R[], filterCb?: (r: number) => boolean): R[]
```

**Example**

```typescript
import { SdExcelReader } from "@simplysm/sd-excel";
import * as fs from "fs";

const reader = new SdExcelReader(fs.readFileSync("data.xlsx"));
const ws = reader.getWorkSheet(0);
const dt = ws.dataTable();
const names = dt.map((r) => dt.val(r, "이름") as string);
```

---

### Internal XML Layer

These classes represent the raw OOXML XML documents inside the `.xlsx` ZIP archive. They are used internally by the core API and are exported for advanced/low-level use cases.

All XML classes implement `ISdExcelXml`:

```typescript
interface ISdExcelXml {
  readonly data: any; // Parsed XML object
  cleanup(): void; // Normalise and sort the XML before serialisation
}
```

| Class                    | File in ZIP                | Description                                                                     |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------- |
| `SdExcelXmlContentType`  | `[Content_Types].xml`      | Manages MIME type overrides for each ZIP part.                                  |
| `SdExcelXmlRelationShip` | `*.rels`                   | Manages OPC relationships (workbook ↔ worksheets, worksheets ↔ drawings, etc.). |
| `SdExcelXmlWorkbook`     | `xl/workbook.xml`          | Sheet list, sheet IDs, and workbook view state.                                 |
| `SdExcelXmlWorksheet`    | `xl/worksheets/sheet*.xml` | Cell data, merge cells, column widths, freeze panes, zoom level.                |
| `SdExcelXmlDrawing`      | `xl/drawings/drawing*.xml` | Image anchors (`twoCellAnchor` and `oneCellAnchor`).                            |
| `SdExcelXmlSharedString` | `xl/sharedStrings.xml`     | Shared string table used for string cell values.                                |
| `SdExcelXmlStyle`        | `xl/styles.xml`            | Number formats, fills, borders, alignments, and cell XF records.                |
| `SdExcelXmlUnknown`      | any other `.xml`           | Pass-through wrapper for unrecognised XML files.                                |

#### `SdExcelXmlContentType`

```typescript
constructor(data?: ISdExcelXmlContentTypeData)

// Register a content type override (idempotent)
add(partName: string, contentType: string): this
```

#### `SdExcelXmlRelationShip`

```typescript
constructor(data?: ISdExcelXmlRelationshipData)

// Look up the Target path for a given relationship ID number
getTargetByRelId(rId: number): string | undefined

// Append a new relationship and return this for chaining
add(target: string, type: string): this

// Append a new relationship and return the assigned ID number
addAndGetId(target: string, type: string): number

// Insert a relationship at a specific ID, shifting any existing IDs ≥ rId upward
insert(rId: number, target: string, type: string): this
```

#### `SdExcelXmlWorkbook`

```typescript
constructor(data?: ISdExcelXmlWorkbookData)

get lastWsRelId(): number | undefined  // highest sheet relationship ID currently registered
get sheetNames(): string[]

addWorksheet(name: string): this

// Ensure the bookViews element exists (required before setZoom/setFix)
initializeView(): void

getWsRelIdByName(name: string): number | undefined
getWsRelIdByIndex(index: number): number | undefined
getWorksheetNameById(id: number): string | undefined
setWorksheetNameById(id: number, newName: string): void
```

#### `SdExcelXmlWorksheet`

```typescript
constructor(data?: ISdExcelXmlWorksheetData)

// Used range. s is always { r: 0, c: 0 }; e reflects the highest occupied row/column index.
get range(): ISdExcelAddressRangePoint

// Cell type: "s" = shared string, "b" = boolean, "str" = formula string
setCellType(addr: { r: number; c: number }, type: "s" | "b" | "str" | undefined): void
getCellType(addr: { r: number; c: number }): string | undefined

setCellVal(addr: { r: number; c: number }, val: string | undefined): void
getCellVal(addr: { r: number; c: number }): string | undefined

setCellFormula(addr: { r: number; c: number }, val: string | undefined): void
getCellFormula(addr: { r: number; c: number }): string | undefined

getCellStyleId(addr: { r: number; c: number }): string | undefined
setCellStyleId(addr: { r: number; c: number }, styleId: string | undefined): void

deleteCell(addr: { r: number; c: number }): void

// Clear only the value/formula/type of a cell while keeping its style
clearCellValue(addr: { r: number; c: number }): void

// Add a merge range; throws if the range overlaps an existing merge
setMergeCells(startAddr: { r: number; c: number }, endAddr: { r: number; c: number }): void

getMergeCells(): { s: { r: number; c: number }; e: { r: number; c: number } }[]

// Remove all merge cells fully contained within [fromAddr, toAddr]
removeMergeCells(fromAddr: { r: number; c: number }, toAddr: { r: number; c: number }): void

setColWidth(colIndex: string, width: string): void
setZoom(percent: number): void
setFix(point: { r?: number; c?: number }): void

// Shift rows ≥ row downward by 1 and adjust merge cell references
insertEmptyRow(row: number): void

// Copy an entire row's data, styles, and merge cells to another row
copyRow(sourceR: number, targetR: number): void

copyCell(sourceAddr: { r: number; c: number }, targetAddr: { r: number; c: number }): void
```

#### `SdExcelXmlDrawing`

```typescript
constructor(data?: ISdExcelXmlDrawingData)

// Add a picture spanning two cell anchors
addPicture(opts: {
  from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  to: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  blipRelId: string;  // relationship ID in the drawing's .rels file, e.g. "rId1"
}): void

// Add a picture with an absolute size anchored to one cell
addOneCellPicture(opts: {
  r: number;
  c: number;
  width: number;   // pixels (converted to EMU internally: × 9525)
  height: number;  // pixels
  left?: number;   // column offset in pixels
  top?: number;    // row offset in pixels
  blipRelId: string;
}): void
```

#### `SdExcelXmlSharedString`

```typescript
constructor(data?: ISdExcelXmlSharedStringData)

getIdByString(str: string): number | undefined
getStringById(id: number): string | undefined

// Add a string and return its new shared-string index
add(str: string): number
```

#### `SdExcelXmlStyle`

```typescript
constructor(data?: ISdExcelXmlStyleData)

// Create a new XF record from scratch and return its string ID
add(style: ISdExcelStyle): string

// Clone an existing XF record (by string ID), apply overrides, and return the new ID
addWithClone(id: string, style: ISdExcelStyle): string

// Read back a parsed style from a string ID
get(id: string): ISdExcelStyle

// Look up the format code string for a given numFmtId
getNumFmtCode(numFmtId: string): string | undefined
```

#### `SdExcelXmlUnknown`

Pass-through wrapper with no behaviour. Stores raw parsed XML for any ZIP entry not recognised by the `ZipCache` dispatcher.

```typescript
constructor(data: Record<string, any>)
```

---

### Utility (SdExcelUtils / ZipCache)

#### `SdExcelUtils`

Static helpers for converting between Excel address strings and 0-based `{r, c}` indices, and between Excel serial date numbers and JavaScript timestamps.

```typescript
import { SdExcelUtils } from "@simplysm/sd-excel";
```

| Method                          | Description                                                            |
| ------------------------------- | ---------------------------------------------------------------------- |
| `stringifyAddr(point)`          | `{ r: 0, c: 0 }` → `"A1"`                                              |
| `stringifyRowAddr(r)`           | `0` → `"1"`                                                            |
| `stringifyColAddr(c)`           | `0` → `"A"`, `25` → `"Z"`, `26` → `"AA"`                               |
| `parseRowAddrCode(addrCode)`    | `"A1"` or `"1"` → `0`                                                  |
| `parseColAddrCode(addrCode)`    | `"A1"` or `"A"` → `0`                                                  |
| `parseCellAddrCode(addr)`       | `"B3"` → `{ r: 2, c: 1 }`                                              |
| `parseRangeAddrCode(rangeAddr)` | `"A1:C3"` → `{ s: { r:0, c:0 }, e: { r:2, c:2 } }`                     |
| `stringifyRangeAddr(point)`     | Inverse of `parseRangeAddrCode`; returns single address when `s === e` |
| `convertTimeTickToNumber(tick)` | JS timestamp (ms) → Excel serial date number                           |
| `convertNumberToTimeTick(num)`  | Excel serial date number → JS timestamp (ms)                           |
| `convertNumFmtCodeToName(code)` | OOXML format code string → `TSdExcelNumberFormat`                      |
| `convertNumFmtIdToName(id)`     | OOXML numFmtId number → `TSdExcelNumberFormat`                         |
| `convertNumFmtNameToId(name)`   | `TSdExcelNumberFormat` → OOXML numFmtId number                         |

```typescript
SdExcelUtils.stringifyAddr({ r: 0, c: 0 }); // "A1"
SdExcelUtils.parseCellAddrCode("C4"); // { r: 3, c: 2 }
SdExcelUtils.convertNumFmtNameToId("DateOnly"); // 14
```

---

#### `ZipCache`

Internal ZIP + parsed-XML cache that backs `SdExcelWorkbook`. Exported for advanced use. Automatically dispatches each `.xml` entry to the correct `SdExcelXml*` class on first access.

```typescript
import { ZipCache } from "@simplysm/sd-excel";
```

**Constructor**

```typescript
constructor(arg?: Blob | Buffer)
```

**Methods**

```typescript
// Retrieve a parsed XML object or raw Buffer; returns undefined if not present
getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined>

// Check existence without loading
existsAsync(filePath: string): Promise<boolean>

// Store a parsed XML object or raw Buffer
set(filePath: string, content: ISdExcelXml | Buffer): void

// Serialise all cached entries and compress to a ZIP Buffer
toBufferAsync(): Promise<Buffer>

// Release ZIP resources and clear the cache
closeAsync(): Promise<void>
```

---

## Types

### Value type

```typescript
// TSdExcelValueType — accepted by setValAsync / setDataMatrixAsync / setRecords
type TSdExcelValueType =
  | number
  | string
  | DateOnly // from @simplysm/sd-core-common
  | DateTime // from @simplysm/sd-core-common
  | Time // from @simplysm/sd-core-common
  | boolean
  | undefined;
```

### Number format

```typescript
// TSdExcelNumberFormat — named format presets
type TSdExcelNumberFormat = "number" | "string" | "DateOnly" | "DateTime" | "Time";

// Constant array of all valid values
const sdExcelNumberFormats: TSdExcelNumberFormat[];
```

### Style

```typescript
interface ISdExcelStyle {
  numFmtId?: string; // raw OOXML numFmtId
  numFmtCode?: string; // custom format code, e.g. "#,##0.00"
  border?: ("left" | "right" | "top" | "bottom")[]; // thin black borders
  background?: string; // "AARRGGBB" hex (alpha-inverted)
  verticalAlign?: "center" | "top" | "bottom";
  horizontalAlign?: "center" | "left" | "right";
}
```

### Address types

```typescript
interface ISdExcelAddressPoint {
  r: number; // 0-based row index
  c: number; // 0-based column index
}

interface ISdExcelAddressRangePoint {
  s: ISdExcelAddressPoint; // start (top-left)
  e: ISdExcelAddressPoint; // end (bottom-right)
}
```

### XML data structure types

Raw OOXML-to-TypeScript shape types. Useful when accessing `.data` on an XML class directly.

```typescript
ISdExcelXml; // base interface for all XML classes
ISdExcelXmlContentTypeData;
ISdExcelXmlRelationshipData;
ISdExcelRelationshipData;
ISdExcelXmlWorkbookData;
ISdExcelXmlWorksheetData;
ISdExcelRowData;
ISdExcelCellData;
ISdExcelXmlDrawingData;
ISdExcelXmlSharedStringData;
TSdExcelXmlSharedStringDataSi;
TSdExcelXmlSharedStringData;
ISdExcelXmlStyleData;
ISdExcelXmlStyleDataXf;
ISdExcelXmlStyleDataFill;
ISdExcelXmlStyleDataBorder;
```

### Wrapper types

```typescript
// Field configuration record used by SdExcelWrapper
type TExcelValidObject = Record<string, TValidFieldSpec<any>>

// Inferred record type for the data read/written by SdExcelWrapper.
// Fields with notnull: true are required (non-optional); all others are optional.
type TExcelValidateObjectRecord<VT extends TExcelValidObject>
```
