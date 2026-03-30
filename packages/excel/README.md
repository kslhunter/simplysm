# @simplysm/excel

Excel file processing library -- read/write .xlsx files with cell styling, formulas, images, and Zod schema-based typed wrapper.

Platform: neutral (Node.js and browser).

## Installation

```bash
npm install @simplysm/excel
```

## API Overview

| Category | Items | Documentation |
|---|---|---|
| Types | ExcelXmlContentTypeData, ExcelXmlRelationshipData, ExcelRelationshipData, ExcelXmlWorkbookData, ExcelXmlWorksheetData, ExcelRowData, ExcelCellData, ExcelXmlDrawingData, ExcelXmlSharedStringData, ExcelXmlSharedStringDataSi, ExcelXmlSharedStringDataText, ExcelXmlStyleData, ExcelXmlStyleDataXf, ExcelXmlStyleDataFill, ExcelXmlStyleDataBorder, ExcelValueType, ExcelNumberFormat, ExcelCellType, ExcelAddressPoint, ExcelAddressRangePoint, ExcelXml, ExcelBorderPosition, ExcelHorizontalAlign, ExcelVerticalAlign, ExcelStyleOptions | [docs/types.md](docs/types.md) |
| Utils | ExcelUtils | [docs/utils.md](docs/utils.md) |
| Core Classes | ExcelCell, ExcelRow, ExcelCol, ExcelWorksheet, ExcelWorkbook | [docs/core.md](docs/core.md) |
| Wrapper | ExcelWrapper | [docs/wrapper.md](docs/wrapper.md) |

## Quick Start

### Read an existing Excel file

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook(fileBytes);
const ws = await wb.getWorksheet(0);

// Read a single cell
const value = await ws.cell(0, 0).getValue();

// Read as data table (first row = headers)
const records = await ws.getDataTable();
// records: Record<string, ExcelValueType>[]
```

### Create a new Excel file

```typescript
import { ExcelWorkbook } from "@simplysm/excel";

await using wb = new ExcelWorkbook();
const ws = await wb.addWorksheet("Sheet1");

await ws.cell(0, 0).setValue("Name");
await ws.cell(0, 1).setValue("Age");
await ws.cell(1, 0).setValue("Alice");
await ws.cell(1, 1).setValue(30);

// Apply styling
await ws.cell(0, 0).setStyle({
  background: "00FFFF00",
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
});

const bytes = await wb.toBytes();
```

### Typed read/write with Zod schema

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
  active: z.boolean().describe("Active").default(false),
});

const wrapper = new ExcelWrapper(schema);

// Read with type safety and validation
const records = await wrapper.read(fileBytes);

// Write with automatic header/style generation
await using wb = await wrapper.write("Sheet1", records);
const bytes = await wb.toBytes();
```

### Insert an image

```typescript
await ws.addImage({
  bytes: imageBytes,
  ext: "png",
  from: { r: 1, c: 1 },
  to: { r: 5, c: 3 },
});
```

### Row operations

```typescript
// Copy a row (overwrite)
await ws.copyRow(0, 5);

// Insert-copy a row (shifts existing rows down)
await ws.insertCopyRow(0, 3);

// Freeze header row and set zoom
await ws.freezeAt({ r: 0 });
await ws.setZoom(85);
```
