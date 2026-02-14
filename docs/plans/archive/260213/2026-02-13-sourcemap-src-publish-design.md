# Sourcemap External Source + Publish src/ Design

## Goal

Include `src/` in published npm packages and configure sourcemaps to reference external source files instead of inlining `sourcesContent`. This improves IDE "Go to Definition" experience and reduces `.map` file size.

## Changes

### 1. esbuild: Disable sourcesContent

**File:** `packages/sd-cli/src/utils/esbuild-config.ts`

Add `sourcesContent: false` to both `createLibraryEsbuildOptions` and `createServerEsbuildOptions`.

This removes inlined source code from `.map` files. The `sources` field (`"../src/index.ts"`) will resolve to the actual `src/` files included in the package.

### 2. All library packages: Add `"src"` to `files`

Update `package.json` `files` field for every npm-published package:

| Package | Before | After |
|---------|--------|-------|
| core-common | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| core-browser | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| core-node | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| sd-cli | `["dist", "templates"]` | `["dist", "src", "templates"]` |
| eslint-plugin | `["dist"]` | `["dist", "src"]` |
| orm-common | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| orm-node | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| service-common | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| service-client | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| service-server | `["dist", "docs"]` | `["dist", "src", "docs"]` |
| solid | `["dist", "docs", "tailwind.config.ts"]` | `["dist", "src", "docs", "tailwind.config.ts", "tailwind.css"]` |
| excel | `["dist"]` | `["dist", "src"]` |
| storage | `["dist"]` | `["dist", "src"]` |

### 3. solid: Rename and move base.css

- Move `packages/solid/src/base.css` to `packages/solid/tailwind.css` (package root)
- `base.css` is a consumer-facing Tailwind config file (like `tailwind.config.ts`), not a compiled source
- `copySrc: ["**/*.css"]` in `sd.config.ts` is `src/`-relative, so it naturally excludes root files
- Component-specific CSS files (`Card.css`, `DataSheet.css`, etc.) remain in `src/` and are still copied to `dist/` via `copySrc`

**Import path update:**
- `solid-demo/src/main.css`: `@import "@simplysm/solid/src/base.css"` → `@import "@simplysm/solid/tailwind.css"`
- `solid/README.md`: Update import example

### 4. CSS duplication (accepted)

Component CSS files (6 files) will exist in both `src/` and `dist/` (copied via `copySrc`). This is accepted because:
- Only 6 small CSS files (keyframe animations, minimal styles)
- Size impact is negligible
- `dist/` JS files reference CSS via relative paths, so CSS must remain in `dist/`
