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

### Type-safe read/write with Zod (ExcelWrapper)

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
});

const wrapper = new ExcelWrapper(schema);

// Read
const records = await wrapper.read(fileBytes);

// Write
await using wb = await wrapper.write("Members", records);
const output = await wb.toBytes();
```

## Modules

| Module | Description | Details |
|--------|-------------|---------|
| `ExcelWorkbook` | Top-level workbook handle; open/create/export `.xlsx` files | [docs/workbook.md](docs/workbook.md) |
| `ExcelWorksheet` | Single worksheet; cell access, copy, data import/export, images | [docs/workbook.md](docs/workbook.md) |
| `ExcelRow` | Row handle; access cells in a row | [docs/workbook.md](docs/workbook.md) |
| `ExcelCol` | Column handle; access cells, set width | [docs/workbook.md](docs/workbook.md) |
| `ExcelCell` | Single cell; read/write values, formulas, styles, merge | [docs/workbook.md](docs/workbook.md) |
| `ExcelUtils` | Static helpers for address conversion and date/format conversion | [docs/utils.md](docs/utils.md) |
| `ExcelWrapper` | Zod schema-based type-safe read/write | [docs/wrapper.md](docs/wrapper.md) |
| Types | Value, address, style, and XML data type definitions | [docs/types.md](docs/types.md) |
