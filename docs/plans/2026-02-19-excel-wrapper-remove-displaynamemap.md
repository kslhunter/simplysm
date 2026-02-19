# ExcelWrapper: Remove displayNameMap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove the separate `displayNameMap` parameter from `ExcelWrapper` and derive display names from Zod's `.describe()`, falling back to the field key name.

**Architecture:** Replace the `_displayNameMap` constructor parameter with a private `_getDisplayNameMap()` method that reads `schema.shape[key].description ?? key`. All internal references to `_displayNameMap` are replaced with this method.

**Tech Stack:** TypeScript, Zod, Vitest

---

### Task 1: Update tests to use new API (schema-only constructor)

**Files:**
- Modify: `packages/excel/tests/excel-wrapper.spec.ts`

**Step 1: Rewrite test file to remove all `displayNameMap` variables and use `.describe()` on schemas**

Replace every `new ExcelWrapper(schema, displayNameMap)` with `new ExcelWrapper(schema)` where schemas use `.describe()` for display names.

Key changes:
- `testSchema`: Add `.describe("이름")`, `.describe("나이")`, `.describe("이메일")`, `.describe("활성화")` to each field
- Remove `displayNameMap` variable
- `dateSchema`: Add `.describe("제목")`, `.describe("날짜")`
- Remove `dateDisplayMap`
- `dateTimeSchema`: Add `.describe("제목")`, `.describe("일시")`
- Remove `dateTimeDisplayMap`
- `timeSchema`: Add `.describe("제목")`, `.describe("시간")`
- Remove `timeDisplayMap`
- `strictSchema`: Add `.describe("이름")`, `.describe("나이")`
- Remove `strictDisplayMap`

```typescript
// Before
const testSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
  active: z.boolean().default(false),
});
const displayNameMap = { name: "이름", age: "나이", email: "이메일", active: "활성화" };
const wrapper = new ExcelWrapper(testSchema, displayNameMap);

// After
const testSchema = z.object({
  name: z.string().describe("이름"),
  age: z.number().describe("나이"),
  email: z.string().optional().describe("이메일"),
  active: z.boolean().default(false).describe("활성화"),
});
const wrapper = new ExcelWrapper(testSchema);
```

**Step 2: Run tests to verify they fail (implementation not yet updated)**

Run: `pnpm vitest packages/excel/tests/excel-wrapper.spec.ts --project=node --run`
Expected: FAIL — `ExcelWrapper` constructor still expects 2 arguments

---

### Task 2: Update ExcelWrapper implementation

**Files:**
- Modify: `packages/excel/src/excel-wrapper.ts`

**Step 3: Refactor constructor and add `_getDisplayNameMap()`**

Changes:
1. Remove `_displayNameMap` parameter from constructor — only keep `_schema`
2. Remove JSDoc `@param _displayNameMap` line
3. Add private method `_getDisplayNameMap()`:

```typescript
private _getDisplayNameMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, fieldSchema] of Object.entries(this._schema.shape)) {
    map[key] = (fieldSchema as z.ZodType).description ?? key;
  }
  return map;
}
```

4. Replace all `this._displayNameMap` references:
   - `read()` line 39: `Object.values(this._displayNameMap)` → `Object.values(this._getDisplayNameMap())`
   - `write()` line 105: `Object.keys(this._displayNameMap)` → `Object.keys(this._getDisplayNameMap())`
   - `write()` line 106: `keys.map((key) => this._displayNameMap[key])` → `const displayNameMap = this._getDisplayNameMap();` then `keys.map((key) => displayNameMap[key])`
   - `_getReverseDisplayNameMap()` line 155: `Object.entries(this._displayNameMap)` → `Object.entries(this._getDisplayNameMap())`

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/excel/tests/excel-wrapper.spec.ts --project=node --run`
Expected: All PASS

**Step 5: Run typecheck and lint**

Run: `pnpm typecheck packages/excel && pnpm lint packages/excel`
Expected: No errors

---

### Task 3: Update README

**Files:**
- Modify: `packages/excel/README.md`

**Step 6: Update ExcelWrapper documentation**

Update sections:
1. **"ExcelWrapper (Zod Schema-based Wrapper)"** section (~line 294–318): Remove `displayNameMap` variable, add `.describe()` to schema fields
2. **"ExcelWrapper API"** table (~line 439–445): Update constructor description from `constructor(schema, displayNameMap)` to `constructor(schema)`
3. **"Reading from Excel"** section (~line 351–355): Remove reference to `_displayNameMap`

**Step 7: Commit**

```bash
git add packages/excel/src/excel-wrapper.ts packages/excel/tests/excel-wrapper.spec.ts packages/excel/README.md
git commit -m "refactor(excel): remove displayNameMap, use schema .describe() for display names"
```
