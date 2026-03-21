# @simplysm/excel

Excel file processing library. Platform-neutral (works in both browser and Node.js).

## Installation

```bash
npm install @simplysm/excel
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `ExcelValueType` | type | Union of supported cell value types (`number`, `string`, `DateOnly`, `DateTime`, `Time`, `boolean`, `undefined`) |
| `ExcelNumberFormat` | type | Number format name (`"number"`, `"string"`, `"DateOnly"`, `"DateTime"`, `"Time"`) |
| `ExcelCellType` | type | Cell type identifier (`"s"`, `"b"`, `"str"`, `"n"`, `"inlineStr"`, `"e"`) |
| `ExcelAddressPoint` | interface | Cell coordinate (`r`, `c`, 0-based) |
| `ExcelAddressRangePoint` | interface | Range of cell coordinates (`s`, `e`) |
| `ExcelBorderPosition` | type | Border position (`"left"`, `"right"`, `"top"`, `"bottom"`) |
| `ExcelHorizontalAlign` | type | Horizontal alignment (`"center"`, `"left"`, `"right"`) |
| `ExcelVerticalAlign` | type | Vertical alignment (`"center"`, `"top"`, `"bottom"`) |
| `ExcelStyleOptions` | interface | Cell style options (`background`, `border`, `horizontalAlign`, `verticalAlign`, `numberFormat`) |
| `ExcelXml` | interface | Excel XML interface (`data`, `cleanup()`) |
| `ExcelXmlContentTypeData` | interface | Content type XML data |
| `ExcelXmlRelationshipData` | interface | Relationship XML data |
| `ExcelRelationshipData` | interface | Single relationship data |
| `ExcelXmlWorkbookData` | interface | Workbook XML data |
| `ExcelXmlWorksheetData` | interface | Worksheet XML data |
| `ExcelRowData` | interface | Row XML data |
| `ExcelCellData` | interface | Cell XML data |
| `ExcelXmlDrawingData` | interface | Drawing XML data |
| `ExcelXmlSharedStringData` | interface | Shared strings XML data |
| `ExcelXmlSharedStringDataSi` | type | Shared string item |
| `ExcelXmlSharedStringDataText` | type | Shared string text |
| `ExcelXmlStyleData` | interface | Style XML data |
| `ExcelXmlStyleDataXf` | interface | Cell format definition |
| `ExcelXmlStyleDataFill` | interface | Fill style definition |
| `ExcelXmlStyleDataBorder` | interface | Border style definition |

-> See [docs/types.md](./docs/types.md) for details.

### Utilities

| API | Type | Description |
|-----|------|-------------|
| `ExcelUtils` | class | Cell address conversion, date/number conversion, number format processing |

-> See [docs/utilities.md](./docs/utilities.md) for details.

### Core Classes

| API | Type | Description |
|-----|------|-------------|
| `ExcelWorkbook` | class | Workbook processing with lazy-loading ZIP architecture |
| `ExcelWorksheet` | class | Worksheet with cell access, copying, data tables, images |
| `ExcelRow` | class | Row with cell access |
| `ExcelCol` | class | Column with cell access and width configuration |
| `ExcelCell` | class | Cell with value, formula, style, and merge operations |

-> See [docs/core-classes.md](./docs/core-classes.md) for details.

### Wrapper

| API | Type | Description |
|-----|------|-------------|
| `ExcelWrapper` | class | Zod schema-based type-safe Excel read/write |

-> See [docs/wrapper.md](./docs/wrapper.md) for details.

## Usage Examples

### Create a new workbook

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook();
const ws = await wb.addWorksheet("Sheet1");
await ws.cell(0, 0).setValue("Name");
await ws.cell(0, 1).setValue("Age");
await ws.cell(1, 0).setValue("Alice");
await ws.cell(1, 1).setValue(30);
const bytes = await wb.toBytes();
```

### Read an existing workbook

```typescript
await using wb = new ExcelWorkbook(fileBytes);
const ws = await wb.getWorksheet(0);
const value = await ws.cell(0, 0).getValue();
const dataTable = await ws.getDataTable();
```

### Type-safe read/write with Zod schema

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
});

const wrapper = new ExcelWrapper(schema);

// Read
const records = await wrapper.read(fileBytes);

// Write
await using wb = await wrapper.write("Sheet1", [
  { name: "Alice", age: 30 },
]);
const bytes = await wb.toBytes();
```
