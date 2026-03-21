# ExcelWrapper

Zod schema-based Excel wrapper. Infers type information from schema to provide type-safe read/write.

```typescript
import { ExcelWrapper } from "@simplysm/excel";
```

## Class: `ExcelWrapper<TSchema>`

### Constructor

```typescript
constructor(schema: TSchema)
```

- `schema` -- Zod object schema. Defines the record structure. Use `.describe()` on fields to specify Excel header names.

### `read`

Read Excel file into record array.

```typescript
async read(
  file: Bytes | Blob,
  wsNameOrIndex?: string | number,
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<z.infer<TSchema>[]>;
```

**Parameters:**
- `file` -- Excel file data (Uint8Array or Blob)
- `wsNameOrIndex` -- Worksheet name or index (default: `0`)
- `options.excludes` -- Field keys to exclude from reading

Values are automatically converted based on the Zod schema type:
- `ZodString` -- converts to string
- `ZodNumber` -- converts to number
- `ZodBoolean` -- converts to boolean (`"1"`, `"true"` -> `true`)
- `DateOnly`, `DateTime`, `Time` -- preserved as-is from Excel

Each row is validated against the Zod schema. Rows where all values are empty are skipped.

### `write`

Record array to Excel workbook.

The caller is responsible for managing the returned workbook's resources. Use `await using` or call `close()` after use.

```typescript
async write(
  wsName: string,
  records: Partial<z.infer<TSchema>>[],
  options?: { excludes?: (keyof z.infer<TSchema>)[] },
): Promise<ExcelWorkbook>;
```

**Parameters:**
- `wsName` -- Worksheet name
- `records` -- Record array to write
- `options.excludes` -- Field keys to exclude from writing

**Behavior:**
- Headers are written in the first row using `.describe()` names (or field keys if no description)
- Data rows follow from row index 1
- All cells get border styling (`left`, `right`, `top`, `bottom`)
- Required field headers (non-optional, non-nullable, non-default, non-boolean) are highlighted in yellow (`00FFFF00`)
- Zoom is set to 85%
- First row is frozen

## Example

```typescript
import { z } from "zod";
import { ExcelWrapper } from "@simplysm/excel";

const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
  email: z.string().optional().describe("Email"),
  active: z.boolean().default(false).describe("Active"),
});

const wrapper = new ExcelWrapper(schema);

// Read Excel file
const records = await wrapper.read(fileBytes);
// records: { name: string; age: number; email?: string; active: boolean }[]

// Write to Excel
await using wb = await wrapper.write("Users", [
  { name: "Alice", age: 30, email: "alice@example.com" },
  { name: "Bob", age: 25 },
]);
const bytes = await wb.toBytes();

// Exclude specific fields
const records2 = await wrapper.read(fileBytes, 0, { excludes: ["email"] });
await using wb2 = await wrapper.write("Users", records2, { excludes: ["email"] });
```
