# ExcelWrapper: Remove displayNameMap

## Context

`ExcelWrapper` currently takes two separate arguments: a Zod schema and a `displayNameMap`.
Since Zod already provides `.describe()` for attaching metadata to fields, the separate
`displayNameMap` is redundant. This refactoring merges display name responsibility into the schema.

## Design

### API Change

**Before:**
```typescript
const schema = z.object({ name: z.string(), age: z.number() });
const wrapper = new ExcelWrapper(schema, { name: "Name", age: "Age" });
```

**After:**
```typescript
const schema = z.object({
  name: z.string().describe("Name"),
  age: z.number().describe("Age"),
  email: z.string().optional(),  // no describe → header is "email"
});
const wrapper = new ExcelWrapper(schema);
```

### Display Name Resolution

```
schema.shape[key].description ?? key
```

- If `.describe()` is set → use description as Excel header
- If not set → use the field key name as-is

### Column Order

Determined by `Object.keys(schema.shape)` — same as field definition order in `z.object()`.

### Files to Modify

| File | Change |
|------|--------|
| `packages/excel/src/excel-wrapper.ts` | Remove `_displayNameMap` param, add `_getDisplayNameMap()` from schema |
| `packages/excel/tests/excel-wrapper.spec.ts` | Update all tests to use `.describe()` instead of `displayNameMap` |
| `packages/excel/README.md` | Update API docs if applicable |

### Internal Changes (excel-wrapper.ts)

1. **Constructor**: Remove `_displayNameMap` parameter
2. **New private method** `_getDisplayNameMap()`: Build `Record<string, string>` from `schema.shape` using `description ?? key`
3. **`read()`**: Replace `this._displayNameMap` references with `this._getDisplayNameMap()`
4. **`write()`**: Replace `this._displayNameMap` references with `this._getDisplayNameMap()`
5. **`_getReverseDisplayNameMap()`**: Derive from `_getDisplayNameMap()` instead of `_displayNameMap`

## Verification

```bash
pnpm vitest packages/excel/tests/excel-wrapper.spec.ts --project=node
pnpm typecheck packages/excel
pnpm lint packages/excel
```
