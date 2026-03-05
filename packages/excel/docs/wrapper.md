# ExcelWrapper

A Zod schema-based high-level wrapper that provides type-safe reading and writing of Excel files. Use `.describe()` on schema fields to specify the Excel column header name.

```typescript
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
  joinDate: z.instanceof(DateOnly).optional().describe("Join Date"),
});

const wrapper = new ExcelWrapper(schema);

// Read Excel file into typed records
const records = await wrapper.read(fileBytes);
const records2 = await wrapper.read(fileBytes, "Sheet1");
const records3 = await wrapper.read(fileBytes, 0, { excludes: ["age"] });

// Write records to Excel workbook
await using wb = await wrapper.write("Members", records);
const bytes = await wb.toBytes();

// Write with excludes
await using wb2 = await wrapper.write("Members", records, { excludes: ["joinDate"] });
```

## Constructor

```typescript
constructor(schema: TSchema extends z.ZodObject<z.ZodRawShape>)
```

## Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `read` | `(file: Bytes \| Blob, wsNameOrIndex?: string \| number, options?: { excludes?: (keyof TSchema)[] }) => Promise<z.infer<TSchema>[]>` | Read an Excel file into a typed record array |
| `write` | `(wsName: string, records: Partial<z.infer<TSchema>>[], options?: { excludes?: (keyof TSchema)[] }) => Promise<ExcelWorkbook>` | Write records to a new `ExcelWorkbook` (caller manages lifecycle) |

## Behavior Notes

- Header names are taken from Zod field `.describe()` values; if not set, the field key is used.
- `read` throws if no data rows are found after the header row.
- `write` automatically applies borders to all data cells, highlights required (non-optional, non-boolean) header cells with a yellow background, sets zoom to 85%, and freezes the first row.
- The `ExcelWorkbook` returned by `write` must be closed by the caller (`await using` or `close()`).
