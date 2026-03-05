# core-common API Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove Hungarian-style prefixes from all core-common utility functions and group them into namespace exports via `export * as`.

**Architecture:** Rename exported functions/types in each util source file, update internal cross-references, change index.ts to use `export * as <ns>`, then migrate all consumer packages to use `import { ns } from "@simplysm/core-common"; ns.fn()` pattern.

**Tech Stack:** TypeScript, pnpm, vitest

---

### Task 1: Rename obj.ts exports

**Files:**
- Modify: `packages/core-common/src/utils/obj.ts`

**Step 1: Rename public exports**

In `packages/core-common/src/utils/obj.ts`, rename all exported symbols:

Functions (find → replace, whole word):
- `objClone` → `clone`
- `objEqual` → `equal`
- `objMerge` → `merge` (also recursive calls inside the function)
- `objMerge3` → `merge3`
- `objOmit` → `omit`
- `objOmitByFilter` → `omitByFilter`
- `objPick` → `pick`
- `objGetChainValue` → `getChainValue`
- `objGetChainValueByDepth` → `getChainValueByDepth`
- `objSetChainValue` → `setChainValue`
- `objDeleteChainValue` → `deleteChainValue`
- `objClearUndefined` → `clearUndefined`
- `objClear` → `clear` (but NOT `clearUndefined` — must use whole word)
- `objNullToUndefined` → `nullToUndefined`
- `objUnflatten` → `unflatten`
- `objKeys` → `keys`
- `objEntries` → `entries`
- `objFromEntries` → `fromEntries`
- `objMap` → `map`

Types:
- `ObjMergeOptions` → `MergeOptions`
- `ObjMerge3KeyOptions` → `Merge3KeyOptions`
- `ObjUndefToOptional` → `UndefToOptional`
- `ObjOptionalToUndef` → `OptionalToUndef`

EqualOptions property:
- `onlyOneDepth` → `shallow` (in interface definition AND all usages within the file)

**Step 2: Rename private helpers**

Private functions that have `obj` prefix (not exported, but need consistent naming):
- `objCloneImpl` → `cloneImpl`
- `objEqualArray` → `equalArray`
- `objEqualMap` → `equalMap`
- `objEqualObject` → `equalObject`
- `objEqualSet` → `equalSet`
- `objNullToUndefinedImpl` → `nullToUndefinedImpl`
- `objMapImpl` → `mapImpl`
- Type `ObjEntries` → `Entries`

**Step 3: Update region comments**

Update `#region` comments to match new names (e.g., `#region objClone` → `#region clone`, `#region objEqual` → `#region equal`, etc.)

**Step 4: Verify no leftover `obj` prefixes**

Search the file for `/\bobj[A-Z]/` and `/\bObj[A-Z]/` to ensure no prefixed names remain.

---

### Task 2: Rename str.ts, num.ts, bytes.ts exports

**Files:**
- Modify: `packages/core-common/src/utils/str.ts`
- Modify: `packages/core-common/src/utils/num.ts`
- Modify: `packages/core-common/src/utils/bytes.ts`

**Step 1: Rename str.ts exports**

In `packages/core-common/src/utils/str.ts`:
- `koreanGetSuffix` → `getKoreanSuffix`
- `strReplaceFullWidth` → `replaceFullWidth`
- `strToPascalCase` → `toPascalCase`
- `strToCamelCase` → `toCamelCase`
- `strToKebabCase` → `toKebabCase`
- `strToSnakeCase` → `toSnakeCase`
- `strIsNullOrEmpty` → `isNullOrEmpty`
- `strInsert` → `insert`

**Step 2: Rename num.ts exports**

In `packages/core-common/src/utils/num.ts`:
- `numParseInt` → `parseInt`
- `numParseFloat` → `parseFloat`
- `numParseRoundedInt` → `parseRoundedInt` (also update internal call: `numParseFloat(text)` → `parseFloat(text)`)
- `numIsNullOrEmpty` → `isNullOrEmpty`
- `numFormat` → `format`

**Step 3: Rename bytes.ts exports**

In `packages/core-common/src/utils/bytes.ts`:
- `bytesConcat` → `concat`
- `bytesToHex` → `toHex`
- `bytesFromHex` → `fromHex`
- `bytesToBase64` → `toBase64`
- `bytesFromBase64` → `fromBase64`

---

### Task 3: Rename remaining util files

**Files:**
- Modify: `packages/core-common/src/utils/path.ts`
- Modify: `packages/core-common/src/utils/json.ts`
- Modify: `packages/core-common/src/utils/xml.ts`
- Modify: `packages/core-common/src/utils/wait.ts`
- Modify: `packages/core-common/src/utils/transferable.ts`
- Modify: `packages/core-common/src/utils/error.ts`
- Modify: `packages/core-common/src/utils/date-format.ts`
- Modify: `packages/core-common/src/utils/primitive.ts`

**Step 1: path.ts**
- `pathJoin` → `join`
- `pathBasename` → `basename`
- `pathExtname` → `extname`

**Step 2: json.ts**
- `jsonStringify` → `stringify`
- `jsonParse` → `parse`
- Also update internal import: `import { objNullToUndefined } from "./obj"` → `import { nullToUndefined } from "./obj"` and update usage `objNullToUndefined(` → `nullToUndefined(`
- Also update internal import: `import { bytesToHex, bytesFromHex } from "./bytes"` → `import { toHex, fromHex } from "./bytes"` and update usages

**Step 3: xml.ts**
- `xmlParse` → `parse`
- `xmlStringify` → `stringify`

**Step 4: wait.ts**
- `waitUntil` → `until`
- `waitTime` → `time`
- Update internal call: `await waitTime(milliseconds ?? 100)` → `await time(milliseconds ?? 100)`

**Step 5: transferable.ts**
- `transferableEncode` → `encode`
- `transferableDecode` → `decode`

**Step 6: error.ts**
- `errorMessage` → `message`

**Step 7: date-format.ts**
- `formatDate` → `format`
- `normalizeMonth` and `convert12To24` keep their names (internal-only, removed from public API via index.ts namespace export)

**Step 8: primitive.ts**
- `getPrimitiveTypeStr` → `typeStr`

---

### Task 4: Rename Uuid.new() and update internal cross-references

**Files:**
- Modify: `packages/core-common/src/types/uuid.ts`
- Modify: `packages/core-common/src/extensions/arr-ext.ts`
- Modify: `packages/core-common/src/features/serial-queue.ts`
- Modify: `packages/core-common/src/types/date-time.ts`
- Modify: `packages/core-common/src/types/date-only.ts`
- Modify: `packages/core-common/src/types/time.ts`

**Step 1: Rename Uuid.new → Uuid.generate**

In `packages/core-common/src/types/uuid.ts`:
- `static new():` → `static generate():`
- Update JSDoc: `Uuid.new()` → `Uuid.generate()`

**Step 2: Update arr-ext.ts internal imports**

In `packages/core-common/src/extensions/arr-ext.ts`:
- `import { objClone, objEqual, objMerge } from "../utils/obj"` → `import { clone, equal, merge } from "../utils/obj"`
- Update all usages of `objClone(`, `objEqual(`, `objMerge(` in the file to `clone(`, `equal(`, `merge(`

**Step 3: Update serial-queue.ts internal import**

In `packages/core-common/src/features/serial-queue.ts`:
- `import { waitTime } from "../utils/wait"` → `import { time } from "../utils/wait"`
- Update usage: `waitTime(` → `time(`

**Step 4: Update date-time.ts internal imports**

In `packages/core-common/src/types/date-time.ts`:
- `import { convert12To24, formatDate, normalizeMonth } from "../utils/date-format"` → `import { convert12To24, format, normalizeMonth } from "../utils/date-format"`
- Update all `formatDate(` → `format(` usages

**Step 5: Update date-only.ts internal imports**

In `packages/core-common/src/types/date-only.ts`:
- `import { formatDate, normalizeMonth } from "../utils/date-format"` → `import { format, normalizeMonth } from "../utils/date-format"`
- Update all `formatDate(` → `format(` usages

**Step 6: Update time.ts internal imports**

In `packages/core-common/src/types/time.ts`:
- `import { convert12To24, formatDate } from "../utils/date-format"` → `import { convert12To24, format } from "../utils/date-format"`
- Update all `formatDate(` → `format(` usages

---

### Task 5: Update index.ts to namespace exports

**Files:**
- Modify: `packages/core-common/src/index.ts`

**Step 1: Rewrite index.ts**

Replace the entire content with:

```typescript
// @simplysm/core-common
// Common utility package

import "./extensions/arr-ext";
import "./extensions/set-ext";
import "./extensions/map-ext";

export * from "./env";

// arr-extension re-export
export * from "./extensions/arr-ext";

//#region errors
export * from "./errors/sd-error";
export * from "./errors/argument-error";
export * from "./errors/not-implemented-error";
export * from "./errors/timeout-error";
//#endregion

//#region types
export * from "./types/uuid";
export * from "./types/lazy-gc-map";
export * from "./types/date-time";
export * from "./types/date-only";
export * from "./types/time";
//#endregion

//#region features
export * from "./features/debounce-queue";
export * from "./features/serial-queue";
export * from "./features/event-emitter";
//#endregion

//#region utils (namespace exports)
export * as obj from "./utils/obj";
export * as str from "./utils/str";
export * as num from "./utils/num";
export * as bytes from "./utils/bytes";
export * as path from "./utils/path";
export * as json from "./utils/json";
export * as xml from "./utils/xml";
export * as wait from "./utils/wait";
export * as transfer from "./utils/transferable";
export * as err from "./utils/error";
export * as dt from "./utils/date-format";
export * as primitive from "./utils/primitive";
//#endregion

//#region utils (direct exports)
export * from "./utils/template-strings";
//#endregion

//#region zip
export * from "./zip/sd-zip";
//#endregion

//#region type utilities
export * from "./common.types";
//#endregion
```

Note: The design forgot `sd-zip` — it must stay as a direct export.

---

### Task 6: Update core-common test files

**Files:**
- Modify: `packages/core-common/tests/utils/object.spec.ts`
- Modify: `packages/core-common/tests/utils/string.spec.ts`
- Modify: `packages/core-common/tests/utils/number.spec.ts`
- Modify: `packages/core-common/tests/utils/bytes-utils.spec.ts`
- Modify: `packages/core-common/tests/utils/path.spec.ts`
- Modify: `packages/core-common/tests/utils/json.spec.ts`
- Modify: `packages/core-common/tests/utils/xml.spec.ts`
- Modify: `packages/core-common/tests/utils/wait.spec.ts`
- Modify: `packages/core-common/tests/utils/transferable.spec.ts`
- Modify: `packages/core-common/tests/utils/date-format.spec.ts`
- Modify: `packages/core-common/tests/utils/primitive.spec.ts`
- Modify: `packages/core-common/tests/types/uuid.spec.ts`

**Step 1: object.spec.ts**

Change import from:
```typescript
import { objClone as clone, objEqual, objMerge, objMerge3, objOmit, objOmitByFilter, objPick, objGetChainValue, objGetChainValueByDepth, objSetChainValue, objDeleteChainValue, objClearUndefined, objClear, objNullToUndefined, objUnflatten, DateTime, DateOnly, Uuid } from "@simplysm/core-common";
```
to:
```typescript
import { obj, DateTime, DateOnly, Uuid } from "@simplysm/core-common";
```

Then replace all function calls:
- `clone(` → `obj.clone(`
- `objEqual(` → `obj.equal(`
- `objMerge(` → `obj.merge(`
- `objMerge3(` → `obj.merge3(`
- `objOmit(` → `obj.omit(`
- `objOmitByFilter(` → `obj.omitByFilter(`
- `objPick(` → `obj.pick(`
- `objGetChainValue(` → `obj.getChainValue(`
- `objGetChainValueByDepth(` → `obj.getChainValueByDepth(`
- `objSetChainValue(` → `obj.setChainValue(`
- `objDeleteChainValue(` → `obj.deleteChainValue(`
- `objClearUndefined(` → `obj.clearUndefined(`
- `objClear(` → `obj.clear(`
- `objNullToUndefined(` → `obj.nullToUndefined(`
- `objUnflatten(` → `obj.unflatten(`

Also rename `onlyOneDepth` → `shallow` in test option objects.

Also update `Uuid.new()` → `Uuid.generate()`.

**Step 2: string.spec.ts**

Change import to:
```typescript
import { str } from "@simplysm/core-common";
```
Replace: `koreanGetSuffix(` → `str.getKoreanSuffix(`, `strReplaceFullWidth(` → `str.replaceFullWidth(`, `strToPascalCase(` → `str.toPascalCase(`, `strToCamelCase(` → `str.toCamelCase(`, `strToKebabCase(` → `str.toKebabCase(`, `strToSnakeCase(` → `str.toSnakeCase(`, `strInsert(` → `str.insert(`

**Step 3: number.spec.ts**

Change import to:
```typescript
import { num } from "@simplysm/core-common";
```
Replace: `parseInt(` → `num.parseInt(`, `parseRoundedInt(` → `num.parseRoundedInt(`, `parseFloat(` → `num.parseFloat(`, `format(` → `num.format(`

**Step 4: bytes-utils.spec.ts**

Change import to:
```typescript
import { bytes, ArgumentError } from "@simplysm/core-common";
```
Replace: `concat(` → `bytes.concat(`, `toHex(` → `bytes.toHex(`, `fromHex(` → `bytes.fromHex(`, `toBase64(` → `bytes.toBase64(`, `fromBase64(` → `bytes.fromBase64(`

**Step 5: path.spec.ts**

Change import to:
```typescript
import { path } from "@simplysm/core-common";
```
Replace: `pathJoin(` → `path.join(`, `pathBasename(` → `path.basename(`, `pathExtname(` → `path.extname(`

**Step 6: json.spec.ts**

Change import to:
```typescript
import { json, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";
```
Replace: `stringify(` → `json.stringify(`, `parse(` → `json.parse(`, `parse<` → `json.parse<`

**Step 7: xml.spec.ts**

Change import to:
```typescript
import { xml } from "@simplysm/core-common";
```
Replace: `parse(` → `xml.parse(`, `stringify(` → `xml.stringify(`

**Step 8: wait.spec.ts**

Change import to:
```typescript
import { wait, TimeoutError } from "@simplysm/core-common";
```
Replace: `time(` → `wait.time(`, `until(` → `wait.until(`

**Step 9: transferable.spec.ts**

Change import to:
```typescript
import { transfer, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";
```
Replace: `transferEncode(` → `transfer.encode(`, `transferDecode(` → `transfer.decode(`

**Step 10: date-format.spec.ts**

Change import to:
```typescript
import { dt } from "@simplysm/core-common";
```
Replace: `formatDate(` → `dt.format(`

Note: `normalizeMonth` is no longer in the public API. Since the test file imports `normalizeMonth` directly, change to:
```typescript
import { dt } from "@simplysm/core-common";
import { normalizeMonth } from "../../src/utils/date-format";
```
The normalizeMonth tests remain, but import directly from the source file since it's no longer re-exported via index.ts.

**Step 11: primitive.spec.ts**

Change import to:
```typescript
import { primitive, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";
```
Replace: `getPrimitiveTypeStr(` → `primitive.typeStr(`

**Step 12: uuid.spec.ts**

Replace all `Uuid.new()` → `Uuid.generate()`

**Step 13: Run core-common tests**

Run: `pnpm vitest packages/core-common --run`
Expected: ALL PASS

---

### Task 7: Update consumer packages

**Files:** All `.ts` files in consumer packages that import renamed symbols from `@simplysm/core-common`.

Consumer packages: `core-node`, `service-common`, `service-client`, `service-server`, `orm-common`, `orm-node`, `sd-cli`, `excel`, `solid`, `capacitor-plugin-auto-update`, `capacitor-plugin-usb-storage`, `capacitor-plugin-file-system`, `storage`, `lint`

**Strategy:**

For each consumer file that imports renamed symbols from `@simplysm/core-common`:

1. Add namespace import (e.g., `import { obj, str, ... } from "@simplysm/core-common"`)
2. Remove old named imports of renamed symbols
3. Update all usages to namespace style (e.g., `objClone(x)` → `obj.clone(x)`)
4. Update `Uuid.new()` → `Uuid.generate()`
5. Update `onlyOneDepth` → `shallow` in EqualOptions
6. Update type references: `ObjMergeOptions` → `obj.MergeOptions`, etc.

**Important details:**

- Some files import both renamed utils AND non-renamed items (classes, types). Keep non-renamed items as named imports, add namespace for utils.
- Files using `onlyOneDepth` property need it changed to `shallow`.
- For `formatDate`, consumers now use `dt.format(...)` via `import { dt } from "@simplysm/core-common"`.
- For `normalizeMonth`/`convert12To24`, these are NO LONGER exported. Consumer search confirmed no external usage — they were only used internally in core-common.

**Verification per package:**

After updating each package, run: `pnpm typecheck packages/<name>`

After all packages updated, run: `pnpm vitest --run`

---

### Task 8: Full verification and commit

**Step 1: Typecheck entire project**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Lint**

Run: `pnpm lint`
Expected: No errors (or only pre-existing)

**Step 3: Run all tests**

Run: `pnpm vitest --run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(core-common): standardize public API naming with namespace exports

- Remove Hungarian-style prefixes from all utility functions (objClone→clone, strIsNullOrEmpty→isNullOrEmpty, etc.)
- Group utilities into namespace exports (obj, str, num, bytes, path, json, xml, wait, transfer, err, dt, primitive)
- Rename Uuid.new() to Uuid.generate()
- Rename EqualOptions.onlyOneDepth to EqualOptions.shallow
- Remove Obj- prefix from utility types (ObjMergeOptions→MergeOptions, etc.)
- Update all consumer packages to use namespace imports

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
