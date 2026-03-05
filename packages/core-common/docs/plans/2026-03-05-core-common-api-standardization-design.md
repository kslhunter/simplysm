# core-common API Standardization Design

## Overview

Standardize `@simplysm/core-common` public API naming by removing Hungarian-style noun prefixes (`obj`, `str`, `num`, etc.) from function names and grouping related utilities into namespace exports using `export * as` in index.ts.

## Section 1: Complete Change List

### 1.1 Independent Fixes (No Namespace)

| File | Before | After |
|------|--------|-------|
| `types/uuid.ts` | `Uuid.new()` | `Uuid.generate()` |
| `utils/obj.ts` | `EqualOptions.onlyOneDepth` | `EqualOptions.shallow` |

### 1.2 Namespace Assignments and Renames

#### `obj` namespace (`utils/obj.ts`)

| Before | After |
|--------|-------|
| `objClone` | `clone` |
| `objEqual` | `equal` |
| `objMerge` | `merge` |
| `objMerge3` | `merge3` |
| `objOmit` | `omit` |
| `objOmitByFilter` | `omitByFilter` |
| `objPick` | `pick` |
| `objGetChainValue` | `getChainValue` |
| `objGetChainValueByDepth` | `getChainValueByDepth` |
| `objSetChainValue` | `setChainValue` |
| `objDeleteChainValue` | `deleteChainValue` |
| `objClearUndefined` | `clearUndefined` |
| `objClear` | `clear` |
| `objNullToUndefined` | `nullToUndefined` |
| `objUnflatten` | `unflatten` |
| `objKeys` | `keys` |
| `objEntries` | `entries` |
| `objFromEntries` | `fromEntries` |
| `objMap` | `map` |

Types (prefix removal):

| Before | After |
|--------|-------|
| `ObjMergeOptions` | `MergeOptions` |
| `ObjMerge3KeyOptions` | `Merge3KeyOptions` |
| `ObjUndefToOptional` | `UndefToOptional` |
| `ObjOptionalToUndef` | `OptionalToUndef` |

`EqualOptions` stays as-is (already no prefix).

#### `str` namespace (`utils/str.ts`)

| Before | After |
|--------|-------|
| `strIsNullOrEmpty` | `isNullOrEmpty` |
| `strInsert` | `insert` |
| `strToPascalCase` | `toPascalCase` |
| `strToCamelCase` | `toCamelCase` |
| `strToKebabCase` | `toKebabCase` |
| `strToSnakeCase` | `toSnakeCase` |
| `strReplaceFullWidth` | `replaceFullWidth` |
| `koreanGetSuffix` | `getKoreanSuffix` |

#### `num` namespace (`utils/num.ts`)

| Before | After |
|--------|-------|
| `numParseInt` | `parseInt` |
| `numParseFloat` | `parseFloat` |
| `numParseRoundedInt` | `parseRoundedInt` |
| `numIsNullOrEmpty` | `isNullOrEmpty` |
| `numFormat` | `format` |

#### `bytes` namespace (`utils/bytes.ts`)

| Before | After |
|--------|-------|
| `bytesConcat` | `concat` |
| `bytesToHex` | `toHex` |
| `bytesFromHex` | `fromHex` |
| `bytesToBase64` | `toBase64` |
| `bytesFromBase64` | `fromBase64` |

#### `path` namespace (`utils/path.ts`)

| Before | After |
|--------|-------|
| `pathJoin` | `join` |
| `pathBasename` | `basename` |
| `pathExtname` | `extname` |

#### `json` namespace (`utils/json.ts`)

| Before | After |
|--------|-------|
| `jsonStringify` | `stringify` |
| `jsonParse` | `parse` |

#### `xml` namespace (`utils/xml.ts`)

| Before | After |
|--------|-------|
| `xmlParse` | `parse` |
| `xmlStringify` | `stringify` |

#### `wait` namespace (`utils/wait.ts`)

| Before | After |
|--------|-------|
| `waitUntil` | `until` |
| `waitTime` | `time` |

#### `transfer` namespace (`utils/transferable.ts`)

| Before | After |
|--------|-------|
| `transferableEncode` | `encode` |
| `transferableDecode` | `decode` |

#### `err` namespace (`utils/error.ts`)

| Before | After |
|--------|-------|
| `errorMessage` | `message` |

#### `dt` namespace (`utils/date-format.ts`)

| Before | After |
|--------|-------|
| `formatDate` | `format` |

`normalizeMonth` and `convert12To24` are removed from the public API (only used internally within core-common).

#### `primitive` namespace (`utils/primitive.ts`)

| Before | After |
|--------|-------|
| `getPrimitiveTypeStr` | `typeStr` |

### 1.3 No Change (Direct Exports)

- **Template tags** (`js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` from `utils/template-strings.ts`): Direct export, no namespace.
- **`env`** (`env.ts`): Direct export, no namespace.
- **Classes** (`Uuid`, `DateTime`, `DateOnly`, `Time`, `LazyGcMap`, `SdError`, `ArgumentError`, `NotImplementedError`, `TimeoutError`): Direct export.
- **Features** (`DebounceQueue`, `SerialQueue`, `EventEmitter`): Direct export.
- **Extensions** (`arr-ext`, `map-ext`, `set-ext`): Side-effect imports, direct export.
- **Common types** (`common.types.ts`): Direct export.

## Section 2: index.ts Structure and Internal References

### 2.1 Approach: Named Exports + `export * as`

Use `export * as <namespace> from "./utils/<file>"` in index.ts. This is the only ES module syntax that creates namespace grouping while supporting tree-shaking.

### 2.2 New index.ts Structure

```typescript
// Side-effect extensions
import "./extensions/arr-ext";
import "./extensions/set-ext";
import "./extensions/map-ext";

// Direct exports (classes, errors, types, features, env, extensions, template tags)
export * from "./env";
export * from "./extensions/arr-ext";
export * from "./errors/sd-error";
export * from "./errors/argument-error";
export * from "./errors/not-implemented-error";
export * from "./errors/timeout-error";
export * from "./types/uuid";
export * from "./types/lazy-gc-map";
export * from "./types/date-time";
export * from "./types/date-only";
export * from "./types/time";
export * from "./features/debounce-queue";
export * from "./features/serial-queue";
export * from "./features/event-emitter";
export * from "./utils/template-strings";
export * from "./common.types";

// Namespace exports (utility functions)
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
```

### 2.3 Internal References

- **Within core-common**: Files import each other directly (e.g., `import { format } from "../utils/date-format"`). Namespaces only apply to external consumers via index.ts.
- **No internal changes needed** for cross-file imports within core-common.

### 2.4 File-Level Changes

Each util file renames its exported functions/types by removing the prefix. For example in `obj.ts`:
- `export function objClone(...)` becomes `export function clone(...)`
- `export type ObjMergeOptions` becomes `export type MergeOptions`
- Internal references within the same file update accordingly.

## Section 3: Consumer Migration and Test Strategy

### 3.1 Consumer Migration

1. **Find all consumers**: Search the entire monorepo for imports from `@simplysm/core-common` that use renamed symbols.
2. **Update import statements**: Change from `import { objClone } from "@simplysm/core-common"` to `import { obj } from "@simplysm/core-common"` and update usage to `obj.clone(...)`.
3. **No deprecation period**: This is an internal monorepo — all consumers are updated in the same commit. No backward compatibility shims needed.

### 3.2 Test Strategy

1. **Update core-common tests first**: Rename all function references in test files to match new names and use namespace imports.
2. **Run core-common tests**: Verify all pass with the new API.
3. **Update consumer package tests**: Any test in other packages that imports from core-common must be updated.
4. **Run full sd-check**: Typecheck + lint + test across all affected packages, including reverse dependencies.

### 3.3 Affected Package Detection

1. Identify all packages that depend on `@simplysm/core-common` via `package.json` dependencies.
2. Grep those packages for any usage of renamed symbols.
3. Update all usages in a single pass.

### 3.4 Risk Mitigation

- **Type safety**: TypeScript compiler catches any missed renames at build time.
- **No runtime risk**: These are pure renames — no logic changes.
- **Incremental verification**: Run typecheck after each file change to catch issues early.
