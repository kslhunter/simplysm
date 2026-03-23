# @simplysm/sd-excel

Excel file (.xlsx) read/write library built on top of the Open XML format. Provides both high-level APIs for creating and reading workbooks and low-level XML manipulation classes for fine-grained control over spreadsheet internals.

## Installation

```bash
npm install @simplysm/sd-excel
```

## API Overview

### Core

High-level classes for workbook, worksheet, row, column, and cell manipulation.

| API | Type | Description |
|-----|------|-------------|
| `SdExcelWorkbook` | Class | Top-level workbook. Create new or load from `Buffer`/`Blob`, manage worksheets, export to buffer/blob |
| `SdExcelWorksheet` | Class | Worksheet within a workbook. Read/write cells, rows, columns, merge cells, insert images |
| `SdExcelRow` | Class | Represents a single row. Access cells by column index |
| `SdExcelCol` | Class | Represents a single column. Access cells by row index, set column width |
| `SdExcelCell` | Class | Represents a single cell. Get/set values, formulas, styles, and merge ranges |

-> See [docs/core.md](./docs/core.md) for details.

### Legacy

Read-only Excel reader using the `xlsx` (SheetJS) library. Supports older file formats.

| API | Type | Description |
|-----|------|-------------|
| `SdExcelReader` | Class | Read-only workbook reader powered by SheetJS |
| `SdExcelReaderWorksheet` | Class | Read-only worksheet with cell value access and data table extraction |
| `SdExcelReaderDataTable` | Class | Table view of a worksheet region with header-based column access |

-> See [docs/legacy.md](./docs/legacy.md) for details.

### Wrapper

Type-safe Excel read/write wrapper with field validation and automatic type conversion.

| API | Type | Description |
|-----|------|-------------|
| `SdExcelWrapper` | Class | Type-safe read/write wrapper with validation. Defines field schemas for structured Excel I/O |
| `TValidFieldSpec` | Type | Field specification with display name, type, nullability, allowed values, and visibility |
| `TExcelValidObject` | Type | Record mapping field keys to `TValidFieldSpec` entries |
| `TInferField` | Type | Infers the TypeScript type from a constructor type |
| `TFieldValue` | Type | Resolves the value type from a `TValidFieldSpec`, respecting `includes` constraints |
| `TExcelValidateObjectRecord` | Type | Maps a `TExcelValidObject` to a record type, splitting required vs optional fields |

-> See [docs/wrapper.md](./docs/wrapper.md) for details.

### XML

Low-level classes that represent individual XML files inside an .xlsx archive.

| API | Type | Description |
|-----|------|-------------|
| `SdExcelXmlWorkbook` | Class | `xl/workbook.xml` representation. Manages sheet list and views |
| `SdExcelXmlWorksheet` | Class | `xl/worksheets/sheetN.xml` representation. Cell data, merge cells, columns, zoom, freeze panes |
| `SdExcelXmlStyle` | Class | `xl/styles.xml` representation. Fonts, fills, borders, number formats, cell XFs |
| `SdExcelXmlContentType` | Class | `[Content_Types].xml` representation. Registers part content types |
| `SdExcelXmlRelationShip` | Class | `.rels` file representation. Manages relationship IDs and targets |
| `SdExcelXmlDrawing` | Class | `xl/drawings/drawingN.xml` representation. twoCellAnchor and oneCellAnchor pictures |
| `SdExcelXmlSharedString` | Class | `xl/sharedStrings.xml` representation. String deduplication table |
| `SdExcelXmlUnknown` | Class | Fallback for unrecognized XML files inside the archive |
| `ISdExcelStyle` | Interface | Style descriptor used by `SdExcelXmlStyle` methods |

-> See [docs/xml.md](./docs/xml.md) for details.

### Utils

Utility classes for address conversion, number format mapping, and zip caching.

| API | Type | Description |
|-----|------|-------------|
| `SdExcelUtils` | Class | Static utilities: cell address parsing/stringifying, date-number conversion, number format mapping |
| `ZipCache` | Class | Lazy-loading cache over the zip archive. Deserializes XML on first access |

-> See [docs/utils.md](./docs/utils.md) for details.

### Types

Interfaces, type aliases, and constants defining the internal XML data structures.

| API | Type | Description |
|-----|------|-------------|
| `ISdExcelXml` | Interface | Base interface for all XML wrapper classes |
| `ISdExcelXmlContentTypeData` | Interface | Data shape for `[Content_Types].xml` |
| `ISdExcelXmlRelationshipData` | Interface | Data shape for `.rels` files |
| `ISdExcelRelationshipData` | Interface | Single relationship entry |
| `ISdExcelXmlWorkbookData` | Interface | Data shape for `xl/workbook.xml` |
| `ISdExcelXmlWorksheetData` | Interface | Data shape for `xl/worksheets/sheetN.xml` |
| `ISdExcelRowData` | Interface | Single row entry in sheet data |
| `ISdExcelCellData` | Interface | Single cell entry in row data |
| `ISdExcelXmlDrawingData` | Interface | Data shape for drawing XML |
| `ISdExcelXmlSharedStringData` | Interface | Data shape for shared strings XML |
| `ISdExcelXmlStyleData` | Interface | Data shape for styles XML |
| `ISdExcelXmlStyleDataXf` | Interface | Cell format (xf) entry in styles |
| `ISdExcelXmlStyleDataFill` | Interface | Fill entry in styles |
| `ISdExcelXmlStyleDataBorder` | Interface | Border entry in styles |
| `ISdExcelAddressPoint` | Interface | Single cell address `{ r, c }` |
| `ISdExcelAddressRangePoint` | Interface | Cell range `{ s, e }` |
| `TSdExcelXmlSharedStringDataSi` | Type | Union type for shared string `<si>` elements |
| `TSdExcelXmlSharedStringData` | Type | Tuple type for shared string `<t>` elements |
| `TSdExcelValueType` | Type | Union of all supported cell value types |
| `TSdExcelNumberFormat` | Type | String literal union for number format names |
| `sdExcelNumberFormats` | Const | Array of all `TSdExcelNumberFormat` values |

-> See [docs/types.md](./docs/types.md) for details.

## Usage Examples

### Create a workbook and write data

```typescript
import { SdExcelWorkbook } from "@simplysm/sd-excel";

const wb = new SdExcelWorkbook();
const ws = await wb.createWorksheetAsync("Sheet1");

// Write a data matrix
await ws.setDataMatrixAsync([
  ["Name", "Age", "City"],
  ["Alice", 30, "Seoul"],
  ["Bob", 25, "Busan"],
]);

// Style the header row
for (let c = 0; c < 3; c++) {
  await ws.cell(0, c).style.setBackgroundAsync("00FFFF00");
  await ws.cell(0, c).style.setBorderAsync(["left", "right", "top", "bottom"]);
}

// Set column width and freeze the header row
await ws.col(0).setWidthAsync(20);
await ws.setFixAsync({ r: 0 });

const buffer = await wb.getBufferAsync();
```

### Read an existing workbook

```typescript
import { SdExcelWorkbook } from "@simplysm/sd-excel";
import * as fs from "fs";

const data = fs.readFileSync("report.xlsx");
const wb = new SdExcelWorkbook(data);

const ws = await wb.getWorksheetAsync(0);
const table = await ws.getDataTableAsync();
// table is Record<string, any>[] keyed by header row values

await wb.closeAsync();
```

### Type-safe read/write with SdExcelWrapper

```typescript
import { SdExcelWrapper } from "@simplysm/sd-excel";

const wrapper = new SdExcelWrapper({
  name: { displayName: "Name", type: String, notnull: true },
  age: { displayName: "Age", type: Number, notnull: true },
  email: { displayName: "Email", type: String },
});

// Write
const wb = await wrapper.writeAsync("Users", [
  { name: "Alice", age: 30, email: "alice@example.com" },
  { name: "Bob", age: 25 },
]);
const buffer = await wb.getBufferAsync();

// Read
const records = await wrapper.readAsync(buffer, "Users");
// records: { name: string; age: number; email?: string }[]
```
