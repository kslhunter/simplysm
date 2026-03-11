# Code Conventions

## Generic Type Parameters

- Always use descriptive names — bare `T` is prohibited
- Use `T` prefix + descriptive name: `TItem`, `TData`, `TResult`, `TKey`, `TValue`, `TAuthInfo`

## File Naming

- Auxiliary files (`types.ts`, `utils.ts`, etc.) must be prefixed with the main file name (e.g., `CrudSheet.types.ts`)
- File names must be self-identifying without relying on parent directory names

## JSDoc Rules

- Not enforced — omit if the code is self-explanatory.

## Export Patterns

- Re-exports (`export * from`, `export { } from`) are **allowed only in `src/index.ts`**
- Re-exports are prohibited in all other files — duplicate re-exports make code navigation and maintenance difficult
- Always use `export *` (wildcard); explicit `export type { ... } from "..."` is prohibited

## `#region` / `#endregion`

- When keeping a large ts/tsx file intact is preferable to splitting it, use `#region`/`#endregion` to structure sections
- Do not use in simple export files like index.ts (use // comments to separate instead)

## `any` vs `unknown` vs Generics

Choose based on **how the value is used**:

| Type      | When to Use                                          | Key Rule                                          |
|-----------|------------------------------------------------------|---------------------------------------------------|
| `any`     | Value is **passed through** without property access  | No `.prop`, method calls, or type narrowing        |
| `unknown` | Need to **access properties** but type is unknown    | Must narrow with type guard before access           |
| Generic `<T>` | Need to **preserve input/output type relationship** | Caller's type flows through to return type         |

```typescript
// any — pure pass-through, no property access
function logAndStore(value: any): void {
  console.log(value);   // OK: no property access
  storage.push(value);  // OK: simple pass-through
}

// unknown — will access properties, so must narrow first
function getName(data: unknown): string {
  if (typeof data === "object" && data !== null && "name" in data) {
    return String((data as { name: unknown }).name);
  }
  throw new Error("No name property");
}

// Generic — input type is preserved in output
function wrapValue<T>(value: T): { value: T } {
  return { value };
}
```

**any vs Generic (pass-through use):** If a function passes a value through without accessing it and the caller does not need the return type preserved, use `any`. If the caller needs to get back the same type (input→output relationship), use a generic.

## Public API Type Safety

- API changes must be **detectable by typecheck alone** — all affected usage sites must produce compile errors
- Public component props must support **IDE intellisense** (autocompletion, type hints)
- **Structured props** should define explicit interfaces so consumers get autocompletion

```typescript
// Bad — consumer gets no autocompletion, changes go undetected
interface TableProps {
  columns: Record<string, any>;
  onRowClick: Function;
}

// Good — changes to ColumnDef produce compile errors at consumer sites
interface TableProps<TRow> {
  columns: ColumnDef<TRow>[];
  onRowClick?: (row: TRow) => void;
}
```

## No Forced Type Casting

- **`as unknown as X` is prohibited** — a dangerous escape hatch that hides real type errors
- **`as X` is allowed only when no alternative exists** — try the following approaches first:

| Type Error Scenario      | Solution (instead of `as`)                             |
|--------------------------|--------------------------------------------------------|
| Missing property         | Add it to the interface                                |
| Type too wide            | Propagate correctly with generics                      |
| Unknown structure        | Type guard: `if ("prop" in obj)`, `instanceof`         |
| Multiple shapes          | Discriminated union or overloads                       |
| Source is wrong          | Fix the root cause, not the usage site                 |

```typescript
// Bad — casting hides the real problem
const admin = user as unknown as AdminUser;

// Bad — lazy casting instead of proper type narrowing
const name = (event as any).target.name;

// Good — fix parameter type at the source
function getAdminDashboard(admin: AdminUser): string { ...
}

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
