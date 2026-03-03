# Code Conventions

## Generic Type Parameters

- Always use descriptive names — single-letter `T` alone is not allowed
- Use `T` prefix + descriptive name: `TItem`, `TData`, `TResult`, `TKey`, `TValue`, `TAuthInfo`

## Prototype Extensions

Importing `@simplysm/core-common` adds extension methods to Array, Map, Set:

- `Array`: `single()`, `filterExists()`, `groupBy()`, `orderBy()`, etc.
- `Map`: `getOrCreate()`, `update()`
- `Set`: `adds()`, `toggle()`

Before using extension methods: Verify actual existence in `@simplysm/core-common` extensions (check README or source). Do not guess methods that don't exist.

## Function Naming Conventions

- Do not use `Async` suffix on function names — Async is the default
- When both sync and async versions exist, use `Sync` suffix on the sync function

```typescript
// Good
async function readFile() { ... }      // Async (default)
function readFileSync() { ... }        // Sync version

// Bad
async function readFileAsync() { ... } // Async suffix prohibited
```

## File Naming

- Auxiliary files (`types.ts`, `utils.ts`, etc.) must be prefixed with the main file name (e.g., `CrudSheet.types.ts`)
- File names must be self-identifying without relying on the parent directory

## JSDoc Convention

- Not enforced — omit when code is self-explanatory
- When written, use English

## Re-export Restriction

- Re-export (`export * from`, `export { } from`) is **only allowed in `src/index.ts`**
- All other files must not re-export — duplicated re-exports make code harder to find and maintain

## index.ts Export Pattern

- Large packages: `#region`/`#endregion` for sections + `//` for sub-groups
- Small packages (≤10 exports): `//` comments only
- Always `export *` (wildcard), never explicit `export type { ... } from "..."`

## `any` vs `unknown` vs Generics

Choose based on **what you do with the value**:

| Type | When | Key rule |
|------|------|----------|
| `any` | Value is **passed through** without property access | No `.prop`, no method calls, no narrowing |
| `unknown` | Value's properties **will be accessed** but type is unknown | Must narrow with type guard before any access |
| Generic `<T>` | **Input/output type relationship** must be preserved | Caller's type flows through to return type |

```typescript
// any — pure pass-through, no property access
function logAndStore(value: any): void {
  console.log(value);   // OK: no property access
  storage.push(value);  // OK: just forwarding
}

// unknown — will access properties, must narrow first
function getName(data: unknown): string {
  if (typeof data === "object" && data !== null && "name" in data) {
    return String((data as { name: unknown }).name);
  }
  throw new Error("No name property");
}

// Generic — input type preserved in output
function wrapValue<T>(value: T): { value: T } {
  return { value };
}
```

**any vs Generic for pass-through:** If the function only forwards a value without accessing it AND the caller does not need type preservation in the return, use `any`. If the caller needs the same type back (input→output relationship), use a generic.

## Type Safety for Public APIs

- API changes must be detectable via **typecheck alone** — all affected usage sites must show compile errors
- Public component props must support **IDE intellisense** (autocomplete, type hints)
- **No `any` in public-facing types** — use generics or specific union types instead
- **No `Record<string, any>` for structured props** — define explicit interfaces so consumers get autocomplete

```typescript
// Bad — consumers get no autocomplete, changes are invisible
interface TableProps {
  columns: Record<string, any>;
  onRowClick: Function;
}

// Good — changes to ColumnDef break consumers at compile time
interface TableProps<TRow> {
  columns: ColumnDef<TRow>[];
  onRowClick?: (row: TRow) => void;
}
```

## Forced Type Casting Prohibition

- **`as unknown as X` is prohibited** — dangerous escape hatch that silences real type errors
- **`as X` must be avoided** unless there is no alternative — when tempted, try these fixes first:

| Type error situation | Fix (instead of `as`) |
|---------------------|-----------------------|
| Missing properties | Add them to the interface |
| Type too wide | Use generics to propagate correctly |
| Unknown shape | Type guard: `if ("prop" in obj)`, `instanceof` |
| Multiple shapes | Discriminated union or overload |
| Wrong at source | Fix the root cause, not the usage site |

```typescript
// Bad — casting hides the real problem
const admin = user as unknown as AdminUser;

// Bad — lazy cast instead of proper narrowing
const name = (event as any).target.name;

// Good — fix parameter type at the source
function getAdminDashboard(admin: AdminUser): string { ... }

// Good — narrow unknown with type guard
function getNameFromEvent(event: unknown): string {
  if (typeof event === "object" && event !== null && "target" in event) {
    const target = event.target;
    if (typeof target === "object" && target !== null && "name" in target) {
      return String(target.name);
    }
  }
  throw new Error("Invalid event structure");
}
```
