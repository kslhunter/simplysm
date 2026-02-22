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

- 보조 파일(`types.ts`, `utils.ts` 등)은 메인 파일명을 접두어로 붙인다 (예: `CrudSheet.types.ts`)
- 파일명만으로 소속을 식별할 수 있어야 한다

## JSDoc Convention

- Not enforced — omit when code is self-explanatory
- When written, use Korean
