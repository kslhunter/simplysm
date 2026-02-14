# Solid JSX Library Build Fix

## Problem

`pnpm pub` (library build) for the `solid` package outputs `React.createElement` instead of SolidJS JSX transforms.

- **Dev build** (`pnpm dev`): Uses Vite + `vite-plugin-solid` which applies `babel-preset-solid` — works correctly
- **Library build** (`pnpm pub`): Uses esbuild directly with no SolidJS JSX transform — outputs `React.createElement`

Root cause: `createLibraryEsbuildOptions()` in `esbuild-config.ts` has no SolidJS-specific JSX handling. The `tsconfigRaw` receives TypeScript's numeric `jsx` enum value which esbuild ignores, falling back to React defaults.

## Solution

Add `esbuild-plugin-solid` to the library build pipeline, auto-detected based on package dependencies.

### Detection

Read the target package's `package.json`. If `solid-js` is in `dependencies` or `peerDependencies`, apply the SolidJS JSX transform.

### Changes

**Install**: `esbuild-plugin-solid` as a dependency of `sd-cli`

**File**: `packages/sd-cli/src/utils/esbuild-config.ts`

- In `createLibraryEsbuildOptions()`, check if the package has `solid-js` as a dependency
- If yes, add `esbuild-plugin-solid` to the `plugins` array
- `pkgDir` is already available in the options — no interface changes needed

### Fallback

If `esbuild-plugin-solid` doesn't work with `bundle: false` mode, create a custom esbuild plugin using `@babel/core` + `babel-preset-solid` directly.

## Scope

- Only affects library builds (`createLibraryEsbuildOptions`)
- No changes to dev/client builds (already using `vite-plugin-solid`)
- No changes to server builds
- Auto-detection means no sd.config.ts schema changes
