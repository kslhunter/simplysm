# ExcelWrapper

Zod schema-based typed Excel wrapper for type-safe reading and writing.

## ExcelWrapper\<TSchema\>

```typescript
class ExcelWrapper<TSchema extends z.ZodObject<z.ZodRawShape>>
```

Generic class parameterized by a Zod object schema. The schema defines the record structure and uses `.describe()` to set Excel header names.

### Constructor

```typescript
constructor(schema: TSchema)
```

| Parameter | Type | Description |
|---|---|---|
| `schema` | `TSchema` (extends `z.ZodObject`) | Zod schema defining the record structure. Use `.describe("Header Name")` on each field to set the Excel column header. |

### Public Methods

| Method | Signature | Description |
|---|---|---|
| `read` | `(file: Bytes \| Blob, wsNameOrIndex?: string \| number, options?: { excludes?: (keyof z.infer<TSchema>)[] }) => Promise<z.infer<TSchema>[]>` | Read an Excel file into a typed record array. Validates each row against the Zod schema. Throws on validation failure or when no data is found. Default worksheet: index 0. |
| `write` | `(wsName: string, records: Partial<z.infer<TSchema>>[], options?: { excludes?: (keyof z.infer<TSchema>)[] }) => Promise<ExcelWorkbook>` | Convert records to an Excel workbook. Returns an `ExcelWorkbook` -- caller is responsible for resource management (`await using` or `close()`). Automatically: writes headers from schema descriptions, applies borders to all cells, highlights required field headers in yellow, sets 85% zoom, freezes the header row. |

### Read Behavior

- Maps Excel headers to schema fields using `.describe()` display names
- Skips rows where all values are null/empty
- Converts cell values to match schema types (string, number, boolean, DateOnly, DateTime, Time)
- Boolean fields default to `false` when empty
- Validates each row with `schema.safeParse()` and throws with detailed error messages on failure

### Write Behavior

- Header row uses schema field descriptions (falls back to field key)
- Required non-boolean fields get yellow background highlight (`00FFFF00`)
- All data cells get borders on all four sides
- Sets zoom to 85% and freezes the header row

### Usage Example

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
  active: z.boolean().describe("Active").default(false),
  birthDate: z.instanceof(DateOnly).optional().describe("Birth Date"),
});

const wrapper = new ExcelWrapper(schema);

// Read
const records = await wrapper.read(fileBytes);
// records: { name: string; age: number; active: boolean; birthDate?: DateOnly }[]

// Write
await using wb = await wrapper.write("Sheet1", [
  { name: "Alice", age: 30, active: true },
  { name: "Bob", age: 25 },
]);
const bytes = await wb.toBytes();
```
