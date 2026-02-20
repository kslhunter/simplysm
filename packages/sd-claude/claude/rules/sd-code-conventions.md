# Code Conventions

## Generic Type Parameters

- Always use descriptive names — single-letter `T` alone is not allowed
- Use `T` prefix + descriptive name: `TItem`, `TData`, `TResult`, `TKey`, `TValue`, `TAuthInfo`

## Prototype Extensions

Importing `@simplysm/core-common` adds extension methods to Array, Map, Set:
- `Array`: `single()`, `filterExists()`, `groupBy()`, `orderBy()`, etc.
- `Map`: `getOrCreate()`, `update()`
- `Set`: `adds()`, `toggle()`

Before using extension methods: Verify actual existence in `core-common/src/extensions/` source (or README). Do not guess methods that don't exist.

## JSDoc Convention

- Not enforced — omit when code is self-explanatory
- When written, use Korean
