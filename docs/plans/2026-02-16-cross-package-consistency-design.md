# Cross-Package Consistency Improvements

## Overview

Standardize patterns across all packages in the simplysm monorepo to improve consistency, regularity, and reduce duplication.

## Changes

### 1. package.json Field Ordering

Standardize all `packages/*/package.json` to npm standard field order:

```
name → version → description → author → license → repository →
type → main → types → files → sideEffects →
dependencies → devDependencies → peerDependencies
```

### 2. sideEffects Cleanup

- `core-common`: Remove `./src/...ts` entries, keep only `./dist/...js` entries
- Other packages: No changes needed

### 3. files Array Fix

- Add `"docs"` to `files` array for packages that have a `docs/` directory but don't include it

### 4. index.ts Export Pattern

**Rule:**
- Large packages (many exports): `#region` sections + `//` sub-comments
- Small packages (≤10 exports): `//` comments only
- All packages use `export *` (wildcard) — no explicit `export type { ... }`

```typescript
// Large package example
//#region ========== Schema ==========

// Table
export * from "./schema/table-builder";
export * from "./schema/view-builder";

// Factory
export * from "./schema/factory/column-builder";

//#endregion

// Small package example
// Core
export * from "./excel-workbook";
export * from "./excel-worksheet";
```

**Migration:** Convert explicit type exports (e.g., `service-client`) to wildcard.

### 5. Path Utility Naming (core-node)

Remove `Get` from function names for concise style:

- `pathGetBasenameWithoutExt` → `pathBasenameWithoutExt`
- Other `Get`-prefixed path functions → remove `Get`
- Update all call sites across the monorepo

### 6. Generic Type Parameter Naming

Always use descriptive names:

- `T` → `TItem`, `TData`, `TResult`, etc. (context-appropriate)
- Single-letter `T` is no longer allowed

### 7. Builder/Factory Pattern (orm-common)

Both class and factory function must be exported:

- Currently factory-only: `createColumnFactory`, `createIndexFactory`, `createRelationFactory`
- Fix: Export their underlying classes alongside the factory functions

### 8. README.md Standardization

Standard template for all packages:

```markdown
# @simplysm/{package-name}

{One-line description}

## Installation

## Main Modules
### {Module Category}
- Class/function description + code examples

## Types

## Dependencies (only when peer deps exist)
```

- Unify heading levels: `##` for major sections, `###` for sub-sections
- Fix CryptoService documentation error in `service-common` README

### 9. JSDoc Convention

- Not enforced — omit when code is self-explanatory
- When written, use Korean

### 10. CLAUDE.md Rule Updates

Add the following rules to CLAUDE.md:

- index.ts export pattern (region + comment convention)
- Generic type parameter naming (always descriptive)
- README.md standard template

## Out of Scope

- Import ordering enforcement (not standardized)
- Class member ordering enforcement (not standardized)
- Missing test directories for `orm-node`, `service-client` (integration tests are appropriate)
