# @simplysm/excel

A TypeScript library for reading and writing Excel files (.xlsx). It works in both Node.js and browser environments, and internally uses a ZIP-based Lazy Loading structure for memory-efficient operation even with large files.

## Installation

```bash
npm install @simplysm/excel
# or
yarn add @simplysm/excel
# or
pnpm add @simplysm/excel
```

## Main Modules

### Core Classes

| Class | Description |
|--------|------|
| `ExcelWorkbook` | Workbook creation, opening, exporting, resource management |
| `ExcelWorksheet` | Worksheet access, data read/write, image insertion, view settings |
| `ExcelRow` | Row-level cell access |
| `ExcelCol` | Column-level cell access and width settings |
| `ExcelCell` | Cell value, formula, style, merge handling |

### Wrapper Classes

| Class | Description |
|--------|------|
| `ExcelWrapper` | Type-safe Excel data conversion based on Zod schemas |

### Utilities

| Class | Description |
|--------|------|
| `ExcelUtils` | Cell address conversion, date/number conversion, number format handling |

### Types

| Type | Description |
|------|------|
| `ExcelValueType` | Cell value type (`number \| string \| DateOnly \| DateTime \| Time \| boolean \| undefined`) |
| `ExcelNumberFormat` | Number format (`"number" \| "string" \| "DateOnly" \| "DateTime" \| "Time"`) |
| `ExcelCellType` | Cell internal type (`"s" \| "b" \| "str" \| "n" \| "inlineStr" \| "e"`) |
| `ExcelStyleOptions` | Cell style options (background color, border, alignment, number format) |
| `ExcelBorderPosition` | Border position (`"left" \| "right" \| "top" \| "bottom"`) |
| `ExcelHorizontalAlign` | Horizontal alignment (`"center" \| "left" \| "right"`) |
| `ExcelVerticalAlign` | Vertical alignment (`"center" \| "top" \| "bottom"`) |
| `ExcelAddressPoint` | Cell coordinates (`{ r: number; c: number }`) |
| `ExcelAddressRangePoint` | Range coordinates (`{ s: ExcelAddressPoint; e: ExcelAddressPoint }`) |

## Usage

### Creating a New Workbook and Writing Cell Values

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

const wb = new ExcelWorkbook();
const ws = await wb.createWorksheet("Sheet1");

// Set cell values (both row and column are 0-based indices)
await ws.cell(0, 0).setVal("Name");
await ws.cell(0, 1).setVal("Age");
await ws.cell(1, 0).setVal("John Doe");
await ws.cell(1, 1).setVal(30);

// Export as Uint8Array
const bytes = await wb.getBytes();

// Or export as Blob (useful for browser downloads)
const blob = await wb.getBlob();

// Release resources (required)
await wb.close();
```

### Reading an Existing File

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// Open workbook from Uint8Array or Blob
const wb = new ExcelWorkbook(bytes);

// Access worksheet by index (0-based)
const ws = await wb.getWorksheet(0);

// Or access worksheet by name
const wsByName = await wb.getWorksheet("Sheet1");

// Read cell values
const name = await ws.cell(0, 0).getVal();   // string | number | boolean | DateOnly | DateTime | Time | undefined
const age = await ws.cell(0, 1).getVal();

// Get list of worksheet names
const sheetNames = await wb.getWorksheetNames();

await wb.close();
```

### Resource Management (await using)

`ExcelWorkbook` implements `Symbol.asyncDispose` for automatic resource cleanup with the `await using` syntax.

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

// close() is automatically called when the scope ends
await using wb = new ExcelWorkbook(bytes);
const ws = await wb.getWorksheet(0);
const value = await ws.cell(0, 0).getVal();
```

If you don't use `await using`, you must release resources with `try-finally`.

```typescript
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  // ... perform operations
} finally {
  await wb.close();
}
```

### Setting Cell Styles

```typescript
const cell = ws.cell(0, 0);

// Background color (ARGB 8-digit hexadecimal: AA=alpha, RR=red, GG=green, BB=blue)
await cell.setStyle({ background: "FFFF0000" });  // Red (opaque)
await cell.setStyle({ background: "00FFFF00" });  // Yellow

// Border
await cell.setStyle({ border: ["left", "right", "top", "bottom"] });

// Alignment
await cell.setStyle({
  horizontalAlign: "center",
  verticalAlign: "center",
});

// Number format
await cell.setStyle({ numberFormat: "number" });
await cell.setStyle({ numberFormat: "DateOnly" });
await cell.setStyle({ numberFormat: "DateTime" });
await cell.setStyle({ numberFormat: "Time" });
await cell.setStyle({ numberFormat: "string" });

// Apply multiple styles at once
await cell.setStyle({
  background: "FFFF0000",
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
  verticalAlign: "center",
  numberFormat: "number",
});
```

### Formulas

```typescript
await ws.cell(0, 0).setVal(10);
await ws.cell(0, 1).setVal(20);
await ws.cell(0, 2).setFormula("A1+B1");  // Result: 30

// Read formula
const formula = await ws.cell(0, 2).getFormula();  // "A1+B1"

// Delete formula
await ws.cell(0, 2).setFormula(undefined);
```

### Cell Merging

```typescript
await ws.cell(0, 0).setVal("Merged Cell");

// Merge from current cell (0,0) to (2,3) (3 rows x 4 columns area, i.e. A1:D3)
await ws.cell(0, 0).merge(2, 3);
```

The arguments of the `merge(r, c)` method are the 0-based row/column indices of the merge endpoint.

### Setting Column Width

```typescript
// Set width of column 0 (column A) to 20
await ws.col(0).setWidth(20);
```

### Copying Rows/Cells

```typescript
// Copy only the style of row 0 to row 2
await ws.copyRowStyle(0, 2);

// Copy entire row 0 to row 2 (values + styles)
await ws.copyRow(0, 2);

// Copy individual cell
await ws.copyCell({ r: 0, c: 0 }, { r: 1, c: 1 });

// Insert copy of source row at target position (existing rows shift down)
await ws.insertCopyRow(0, 3);
```

### Reading Data Table (getDataTable)

Converts worksheet data into a header-based record array. Uses the first row as headers and returns in `Record<string, ExcelValueType>[]` format.

```typescript
// Basic usage: first row is header
const data = await ws.getDataTable();
// [{ "Name": "John Doe", "Age": 30 }, { "Name": "Jane Smith", "Age": 25 }]

// Specify header row index
const data2 = await ws.getDataTable({ headerRowIndex: 2 });

// Determine end of data when specific column is empty
const data3 = await ws.getDataTable({ checkEndColIndex: 0 });

// Filter to only use certain headers
const data4 = await ws.getDataTable({
  usableHeaderNameFn: (name) => ["Name", "Age"].includes(name),
});
```

### Writing Data (setDataMatrix / setRecords)

```typescript
// Write as 2D array
await ws.setDataMatrix([
  ["Name", "Age"],
  ["John Doe", 30],
  ["Jane Smith", 25],
]);

// Write as record array (automatic header generation)
await ws.setRecords([
  { "Name": "John Doe", "Age": 30 },
  { "Name": "Jane Smith", "Age": 25 },
]);
```

### Inserting Images

```typescript
await ws.addImage({
  bytes: imageBytes,   // Uint8Array
  ext: "png",          // Extension (png, jpg, etc.)
  from: { r: 0, c: 0 },                  // Start position (0-based)
  to: { r: 5, c: 3 },                    // End position (0-based)
});

// Specify offset in EMU (English Metric Units)
await ws.addImage({
  bytes: imageBytes,
  ext: "jpg",
  from: { r: 0, c: 0, rOff: 0, cOff: 0 },
  to: { r: 5, c: 3, rOff: 100000, cOff: 100000 },
});

// If 'to' is omitted, inserts at 'from' position with 1 cell size
await ws.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 0, c: 0 },
});
```

### View Settings

```typescript
// Set zoom level (percentage)
await ws.setZoom(85);

// Freeze rows/columns
await ws.setFix({ r: 0 });          // Freeze first row
await ws.setFix({ c: 0 });          // Freeze first column
await ws.setFix({ r: 0, c: 0 });    // Freeze first row + column
```

### Worksheet Name Management

```typescript
const name = await ws.getName();
await ws.setName("New Sheet Name");
```

### ExcelWrapper (Zod Schema-based Wrapper)

`ExcelWrapper` is a wrapper class that allows type-safe reading and writing of Excel data based on Zod schemas.

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

// 1. Define schema
const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
  active: z.boolean(),
});

// 2. Field name to display name mapping (names displayed in Excel headers)
const displayNameMap = {
  name: "Name",
  age: "Age",
  email: "Email",
  active: "Active Status",
};

const wrapper = new ExcelWrapper(schema, displayNameMap);
```

#### Writing to Excel

```typescript
const records = [
  { name: "John Doe", age: 30, email: "john@test.com", active: true },
  { name: "Jane Smith", age: 25, active: false },
];

// write() accepts Partial records and returns ExcelWorkbook, so resource management is required
await using wb = await wrapper.write("Users", records);
const bytes = await wb.getBytes();
```

The `write()` method automatically applies the following formatting:
- Borders on all cells
- Yellow background on required field headers (fields without optional/nullable/default)
- 85% zoom, freeze first row

#### Reading from Excel

```typescript
// Read records from file (Uint8Array or Blob)
const records = await wrapper.read(bytes);
// records: { name: string; age: number; email?: string; active: boolean }[]

// Specify worksheet name or index
const records2 = await wrapper.read(bytes, "Users");
const records3 = await wrapper.read(bytes, 0);
```

Behavior of the `read()` method:
- Only reads headers defined in the schema's `_displayNameMap`
- Skips rows where all values are empty
- Validates each row with the Zod schema, throws error on validation failure
- Throws error if there is no data
- Automatic type conversion: string -> number, string -> boolean ("1"/"true" -> true), etc.

## ExcelUtils API

| Method | Input | Output | Description |
|--------|------|------|------|
| `stringifyAddr(point)` | `{ r: 0, c: 0 }` | `"A1"` | Convert coordinates to cell address string |
| `stringifyRowAddr(r)` | `0` | `"1"` | Convert row index to row address |
| `stringifyColAddr(c)` | `0` | `"A"` | Convert column index to column address (0~16383) |
| `parseCellAddrCode(addr)` | `"B3"` | `{ r: 2, c: 1 }` | Convert cell address to coordinates |
| `parseRowAddrCode(addr)` | `"A3"` | `2` | Extract row index from cell address |
| `parseColAddrCode(addr)` | `"B3"` | `1` | Extract column index from cell address |
| `parseRangeAddrCode(range)` | `"A1:C3"` | `{ s: {r:0,c:0}, e: {r:2,c:2} }` | Convert range address to coordinates |
| `stringifyRangeAddr(point)` | `{ s: {r:0,c:0}, e: {r:2,c:2} }` | `"A1:C3"` | Convert range coordinates to address string |
| `convertTimeTickToNumber(tick)` | JS timestamp (ms) | Excel date number | Convert JS date to Excel number |
| `convertNumberToTimeTick(num)` | Excel date number | JS timestamp (ms) | Convert Excel number to JS date |
| `convertNumFmtIdToName(id)` | Format ID | `ExcelNumberFormat` | Convert built-in format ID to name |
| `convertNumFmtCodeToName(code)` | Format code | `ExcelNumberFormat` | Convert format code to name |
| `convertNumFmtNameToId(name)` | `ExcelNumberFormat` | Format ID | Convert format name to ID |

## ExcelRow API

| Method | Return Type | Description |
|--------|-----------|------|
| `cell(c)` | `ExcelCell` | Get cell at column index (0-based) |
| `getCells()` | `Promise<ExcelCell[]>` | Get all cells in the row |

## ExcelCol API

| Method | Return Type | Description |
|--------|-----------|------|
| `cell(r)` | `ExcelCell` | Get cell at row index (0-based) |
| `getCells()` | `Promise<ExcelCell[]>` | Get all cells in the column |
| `setWidth(size)` | `Promise<void>` | Set column width |

## ExcelCell API

| Member | Type / Return Type | Description |
|--------|-----------|------|
| `addr` | `ExcelAddressPoint` (readonly) | Cell address as 0-based row/column indices |
| `getVal()` | `Promise<ExcelValueType>` | Get cell value |
| `setVal(val)` | `Promise<void>` | Set cell value (deletes cell if undefined) |
| `getFormula()` | `Promise<string \| undefined>` | Get formula |
| `setFormula(val)` | `Promise<void>` | Set formula (deletes formula if undefined) |
| `setStyle(opts)` | `Promise<void>` | Set style |
| `merge(r, c)` | `Promise<void>` | Merge from current cell to (r, c) |
| `getStyleId()` | `Promise<string \| undefined>` | Get style ID |
| `setStyleId(id)` | `Promise<void>` | Directly set style ID |

## ExcelWorksheet API

| Method | Return Type | Description |
|--------|-----------|------|
| `cell(r, c)` | `ExcelCell` | Get cell object (0-based) |
| `row(r)` | `ExcelRow` | Get row object (0-based) |
| `col(c)` | `ExcelCol` | Get column object (0-based) |
| `getName()` | `Promise<string>` | Get worksheet name |
| `setName(name)` | `Promise<void>` | Change worksheet name |
| `getRange()` | `Promise<ExcelAddressRangePoint>` | Get data range |
| `getCells()` | `Promise<ExcelCell[][]>` | Get all cells as 2D array |
| `getDataTable(opt?)` | `Promise<Record<string, ExcelValueType>[]>` | Convert to header-based record array |
| `setDataMatrix(matrix)` | `Promise<void>` | Write 2D array data |
| `setRecords(records)` | `Promise<void>` | Write record array (automatic header generation) |
| `copyRow(src, target)` | `Promise<void>` | Copy row |
| `copyRowStyle(src, target)` | `Promise<void>` | Copy only row style |
| `copyCell(src, target)` | `Promise<void>` | Copy cell |
| `copyCellStyle(src, target)` | `Promise<void>` | Copy only cell style |
| `insertCopyRow(src, target)` | `Promise<void>` | Insert copy of row (existing rows shift) |
| `addImage(opts)` | `Promise<void>` | Insert image |
| `setZoom(percent)` | `Promise<void>` | Set zoom level |
| `setFix(point)` | `Promise<void>` | Set freeze panes |

## ExcelWorkbook API

| Member | Type / Return Type | Description |
|--------|-----------|------|
| `getWorksheet(nameOrIndex)` | `Promise<ExcelWorksheet>` | Get worksheet (name or 0-based index) |
| `createWorksheet(name)` | `Promise<ExcelWorksheet>` | Create new worksheet |
| `getWorksheetNames()` | `Promise<string[]>` | Get all worksheet names |
| `getBytes()` | `Promise<Bytes>` | Export as Uint8Array |
| `getBlob()` | `Promise<Blob>` | Export as Blob |
| `close()` | `Promise<void>` | Release resources |

## ExcelWrapper API

| Member | Type / Return Type | Description |
|--------|-----------|------|
| `constructor(schema, displayNameMap)` | — | Create wrapper with a Zod schema and field-to-display-name map |
| `read(file, wsNameOrIndex?)` | `Promise<z.infer<TSchema>[]>` | Read records from Excel file (Uint8Array or Blob); defaults to first worksheet |
| `write(wsName, records)` | `Promise<ExcelWorkbook>` | Write partial records to a new workbook; caller must manage the returned workbook's lifecycle |

## Caveats

### All Cell Methods are Asynchronous

All cell-related methods in this library are designed as `async`. This is due to the Lazy Loading structure for memory efficiency with large files. Only the necessary XML is loaded selectively depending on the cell type:

- Reading string cells: Loads SharedStrings.xml
- Reading number cells: Does not load SharedStrings
- Cells with styles: Loads Styles.xml

```typescript
// Correct usage
const value = await cell.getVal();
await cell.setVal("Hello");

// Incorrect usage - returns Promise object
const value = cell.getVal();
cell.setVal("Hello");
```

### Resource Cleanup is Required

`ExcelWorkbook` manages ZIP resources internally, so you must call `close()` after use or use `await using`. After calling `close()`, the workbook instance cannot be used.

### Resource Management of ExcelWrapper.write()

`ExcelWrapper.write()` returns `ExcelWorkbook`, so the caller must manage the resource.

```typescript
// Correct usage
await using wb = await wrapper.write("Sheet1", records);
const bytes = await wb.getBytes();

// Or
const wb = await wrapper.write("Sheet1", records);
try {
  const bytes = await wb.getBytes();
} finally {
  await wb.close();
}
```

### Background Color Format

Background colors use the ARGB 8-digit hexadecimal format. It must satisfy the `/^[0-9A-F]{8}$/i` pattern, otherwise an error will occur.

```
Format: AARRGGBB
  AA = alpha (00=transparent, FF=opaque, but reversed in Excel: 00=opaque)
  RR = red
  GG = green
  BB = blue
```

### 0-based Indexing

All row/column indices are 0-based. Cell A1 in Excel corresponds to `cell(0, 0)`, cell B3 corresponds to `cell(2, 1)`.

## License

Apache-2.0
