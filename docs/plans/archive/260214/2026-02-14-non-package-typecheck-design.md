# Non-package typecheck support

## Context

`pnpm typecheck` only checks files under `packages/*/`. Root-level directories like `tests/` are included in `tsconfig.json` but silently skipped because `extractPackages` only matches `packages/{pkg}/...` pattern. Lint works fine since it globs `**/*.{ts,tsx,js,jsx}`.

## Design

### dts.worker.ts

Make `pkgDir` and `env` optional in `DtsBuildInfo`.

When `pkgDir`/`env` are not provided:
- **rootFiles**: `parsedConfig.fileNames` excluding `packages/` prefix files
- **compilerOptions**: `parsedConfig.options` as-is (no `getCompilerOptionsForPackage`)
- **diagnostic filter**: exclude `packages/` prefix files (inverse of current logic)
- **tsBuildInfoFile**: `{cwd}/.cache/typecheck-root.tsbuildinfo`
- **emit**: always `false` (no .d.ts generation)

When `pkgDir`/`env` are provided: no change (existing behavior).

### typecheck.ts

After `extractPackages`, check if any files in `parsedConfig.fileNames` are not under `packages/`. If so, add one extra task:

```typescript
{ name: "root", cwd, emit: false }  // no pkgDir, no env
```

Display name: `"기타"` or similar.

## Files to modify

1. `packages/sd-cli/src/workers/dts.worker.ts` - DtsBuildInfo optional fields, buildDts branching
2. `packages/sd-cli/src/commands/typecheck.ts` - non-package file detection, extra task creation
