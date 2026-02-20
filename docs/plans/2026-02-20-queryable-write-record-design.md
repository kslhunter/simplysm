# QueryableWriteRecord Design

## Problem

`update()` and `upsert()` callbacks require `expr.val()` for every value, while `insert()` accepts plain values directly. This creates inconsistent DX.

## Solution

Introduce `QueryableWriteRecord<TData>` type where each field accepts `ExprInput<T>` (both `ExprUnit<T>` and plain `T`).

## Changes

### 1. New Type: `QueryableWriteRecord<TData>`

Same structure as `QueryableRecord` but fields accept `ExprInput<T>` instead of `ExprUnit<T>`.

### 2. Method Signature Changes

**update():**
- Callback return: `QueryableRecord<TFrom["$inferUpdate"]>` → `QueryableWriteRecord<TFrom["$inferUpdate"]>`
- Callback parameter (cols): stays `QueryableRecord<TData>` (read-only)

**upsert():**
- All overloads: callback return types change to `QueryableWriteRecord`
- Callback parameter (cols): stays `QueryableRecord<TData>` (read-only)

### 3. Runtime Changes: None

`toExpr()` already handles both `ExprUnit` and plain values.

### 4. Files to Modify

1. `packages/orm-common/src/exec/queryable.ts` - type definition + signatures
2. `packages/orm-common/src/index.ts` - export if needed
3. `packages/orm-common/docs/queries.md` - update examples
4. `packages/orm-common/README.md` - type reference update
5. Tests - compatibility check + new plain value tests

### 5. Backward Compatibility

Fully compatible. `ExprUnit<T>` is a subset of `ExprInput<T>`.
