# Function Naming Conventions

- Do not use `Async` suffix on function names — Async is the default
- When both sync and async versions exist, use `Sync` suffix on the sync function

```typescript
// Good
async function readFile() { ... }      // Async (default)
function readFileSync() { ... }        // Sync version

// Bad
async function readFileAsync() { ... } // Async suffix prohibited
```
