# Remove Hardcoded `@simplysm` Scope from sd-cli

## Problem

`sd-cli` has `@simplysm` hardcoded in two places for Vite dev mode watch scopes:

1. `package-utils.ts:getWatchScopes()` — always includes `@simplysm` in watch scopes
2. `vite-config.ts:sdTailwindConfigDepsPlugin()` — always includes `@simplysm` in tailwind config dependency tracking

This hardcoding is unnecessary because:
- **simplysm project itself**: project scope is already `@simplysm` (extracted from `packageName`)
- **External projects**: use `replaceDeps` config (e.g., `{ "@simplysm/*": "../simplysm/packages/*" }`) which contains the scope

## Solution

Extract scopes from `replaceDeps` config keys instead of hardcoding.

## Changes

### 1. `package-utils.ts` — `getWatchScopes()`

Add optional `replaceDeps` parameter. Remove `@simplysm` from initial Set.
Extract scopes from `replaceDeps` keys using `/@([^/]+)\//` pattern.

```typescript
export function getWatchScopes(
  packageName: string,
  replaceDeps?: Record<string, string>,
): string[] {
  const scopes = new Set<string>();
  const match = packageName.match(/^(@[^/]+)\//);
  if (match != null) scopes.add(match[1]);
  if (replaceDeps != null) {
    for (const pattern of Object.keys(replaceDeps)) {
      const depMatch = pattern.match(/^(@[^/]+)\//);
      if (depMatch != null) scopes.add(depMatch[1]);
    }
  }
  return [...scopes];
}
```

### 2. `vite-config.ts` — `sdTailwindConfigDepsPlugin()`

Change from internal hardcoded scopes to receiving `scopes` parameter.
Use `watchScopes` already available in `createViteConfig` options.

```typescript
// Before
function sdTailwindConfigDepsPlugin(pkgDir: string): Plugin {
  const scopes = new Set(["@simplysm"]);
  if (pkgScope != null) scopes.add(pkgScope);
  ...
}

// After
function sdTailwindConfigDepsPlugin(pkgDir: string, scopes: string[]): Plugin {
  // use scopes parameter directly
  ...
}
```

Update `createViteConfig` to pass `watchScopes` to `sdTailwindConfigDepsPlugin`.

### 3. `DevOrchestrator.ts`

Pass `replaceDeps` to `getWatchScopes`:

```typescript
this._watchScopes = getWatchScopes(rootPkgName, this._sdConfig.replaceDeps);
```

### 4. `package-utils.spec.ts`

Update tests:
- Existing tests: pass no `replaceDeps` (backward compatible behavior minus hardcoded `@simplysm`)
- New test: verify `replaceDeps` scope extraction
- New test: verify deduplication when project scope and replaceDeps scope overlap

## Files to Change

| File | Change |
|------|--------|
| `packages/sd-cli/src/utils/package-utils.ts` | Add `replaceDeps` param, remove hardcoded `@simplysm` |
| `packages/sd-cli/src/utils/vite-config.ts` | `sdTailwindConfigDepsPlugin` takes `scopes` param |
| `packages/sd-cli/src/orchestrators/DevOrchestrator.ts` | Pass `replaceDeps` to `getWatchScopes` |
| `packages/sd-cli/tests/package-utils.spec.ts` | Update + add tests |
