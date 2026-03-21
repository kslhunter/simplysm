# @simplysm/excel

Excel file processing library. Platform-neutral (works in both browser and Node.js).

## Installation

```bash
npm install @simplysm/excel
```

## Exports

```typescript
import {
  ExcelWorkbook,
  ExcelWorksheet,
  ExcelRow,
  ExcelCol,
  ExcelCell,
  ExcelUtils,
  ExcelWrapper,
} from "@simplysm/excel";
```

## Quick Start

### Create a new workbook

```typescript
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

## Documentation

- [Types](docs/types.md)
- [Core Classes](docs/core-classes.md)
- [Wrapper](docs/wrapper.md)
