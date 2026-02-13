# Design: Library Build `copySrc` — Copy Non-TS Assets from src/ to dist/

## Context

When `@simplysm/solid` is published to npm, CSS files in `src/` are not included in the package.
The `sd-cli` LibraryBuilder uses esbuild with `bundle: false`, which transpiles TS files individually
but does not process or copy non-TS files (CSS, etc.). Compiled JS files retain `import "./Card.css"`
statements, but the actual CSS files are missing from `dist/`.

## Goal

Add a configuration-based mechanism to copy files matching glob patterns from `src/` to `dist/`
during library builds, with watch mode support.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config scope | Per-package in `sd.config.ts` | Different packages need different patterns |
| Config property | `copySrc: string[]` | Name makes it clear files are copied from `src/` |
| Glob base | Relative to `src/` | `**/*.css` matches `src/base.css` → copies to `dist/base.css` |
| Implementation | Utility function | Same concern as library build; no need for separate Builder class |
| Watch mode | `FsWatcher` from `@simplysm/core-node` | Already a dependency of sd-cli; wraps chokidar with debounce and event merging |

## Configuration

```typescript
// sd.config.ts
const config: SdConfigFn = () => ({
  packages: {
    solid: { target: "browser", publish: "npm", copySrc: ["**/*.css"] },
    // packages without copySrc behave as before
  },
});
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/sd-cli/src/types.ts` | Add `copySrc?: string[]` to `SdBuildPackageConfig` |
| `packages/sd-cli/src/utils/copy-src.ts` (new) | `copySrcFiles()` + `watchCopySrcFiles()` utility functions |
| `packages/sd-cli/src/commands/build.ts` | Call `copySrcFiles()` during library build |
| `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts` | Call `watchCopySrcFiles()` during watch |
| `sd.config.ts` | Add `copySrc: ["**/*.css"]` to solid package |
| `packages/solid/package.json` | Add `sideEffects: ["*.css"]` for tree-shaking protection |

## Utility Functions

### `copySrcFiles(pkgDir: string, patterns: string[]): Promise<void>`
- Glob `patterns` relative to `{pkgDir}/src/`
- Copy each matched file to `{pkgDir}/dist/` preserving relative path
- Used by one-shot build

### `watchCopySrcFiles(pkgDir: string, patterns: string[]): Promise<FsWatcher>`
- Use `FsWatcher.watch()` from `@simplysm/core-node`
- Watch `patterns` mapped to `{pkgDir}/src/` paths
- `onChange()` handler:
  - `add`/`change` → copy file to `dist/`
  - `unlink` → delete from `dist/`
- Returns `FsWatcher` instance for `close()` on shutdown

## Path Mapping

```
src/base.css                            → dist/base.css
src/components/display/Card.css         → dist/components/display/Card.css
src/components/data/sheet/DataSheet.css → dist/components/data/sheet/DataSheet.css
```

## Verification

```bash
pnpm build solid          # Verify CSS files appear in dist/
pnpm watch solid          # Modify a CSS file, verify dist/ updates automatically
pnpm typecheck sd-cli     # Type check passes
```
