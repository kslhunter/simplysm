# Sourcemap External Source + Publish src Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Include `src/` in published npm packages and configure sourcemaps to reference external source files instead of inlining sourcesContent.

**Architecture:** Add `sourcesContent: false` to esbuild config, add `"src"` to all library package.json `files`, move solid's `base.css` to root as `tailwind.css`.

**Tech Stack:** esbuild, pnpm workspaces, npm publish

---

### Task 1: esbuild sourcesContent 비활성화

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:95-106` (createLibraryEsbuildOptions)
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:124-139` (createServerEsbuildOptions)

**Step 1: Add `sourcesContent: false` to library build options**

In `createLibraryEsbuildOptions`, add `sourcesContent: false` after `sourcemap: true`:

```typescript
  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    sourcesContent: false,
    platform: options.target === "node" ? "node" : "browser",
```

**Step 2: Add `sourcesContent: false` to server build options**

In `createServerEsbuildOptions`, add `sourcesContent: false` after `sourcemap: true`:

```typescript
  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    sourcesContent: false,
    platform: "node",
```

**Step 3: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/utils/esbuild-config.ts
git commit -m "feat(sd-cli): disable sourcesContent in esbuild sourcemaps"
```

---

### Task 2: 모든 라이브러리 package.json에 `"src"` 추가

**Files:**
- Modify: `packages/core-common/package.json` — `["dist", "docs"]` → `["dist", "src", "docs"]`
- Modify: `packages/core-browser/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/core-node/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/sd-cli/package.json` — `["dist", "templates"]` → `["dist", "src", "templates"]`
- Modify: `packages/eslint-plugin/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/orm-common/package.json` — `["dist", "docs"]` → `["dist", "src", "docs"]`
- Modify: `packages/orm-node/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/service-common/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/service-client/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/service-server/package.json` — `["dist", "docs"]` → `["dist", "src", "docs"]`
- Modify: `packages/excel/package.json` — `["dist"]` → `["dist", "src"]`
- Modify: `packages/storage/package.json` — `["dist"]` → `["dist", "src"]`

**Step 1: Add `"src"` to each package's `files` array**

For each package listed above, add `"src"` as the second entry in the `files` array (after `"dist"`).

**Step 2: Commit**

```bash
git add packages/*/package.json
git commit -m "chore: add src to npm package files for external sourcemap resolution"
```

---

### Task 3: solid base.css → tailwind.css 이동 및 참조 업데이트

**Files:**
- Move: `packages/solid/src/base.css` → `packages/solid/tailwind.css`
- Modify: `packages/solid/package.json` — `files` 변경: `["dist", "docs", "tailwind.config.ts"]` → `["dist", "src", "docs", "tailwind.config.ts", "tailwind.css"]`
- Modify: `packages/solid-demo/src/main.css:1` — import 경로 변경
- Modify: `packages/solid/README.md:87` — import 예제 변경

**Step 1: Move and rename the file**

```bash
mv packages/solid/src/base.css packages/solid/tailwind.css
```

**Step 2: Update solid package.json files field**

Change `files` from:
```json
"files": [
  "dist",
  "docs",
  "tailwind.config.ts"
],
```
to:
```json
"files": [
  "dist",
  "src",
  "docs",
  "tailwind.config.ts",
  "tailwind.css"
],
```

**Step 3: Update solid-demo import**

In `packages/solid-demo/src/main.css`, change line 1 from:
```css
@import "@simplysm/solid/src/base.css";
```
to:
```css
@import "@simplysm/solid/tailwind.css";
```

**Step 4: Update solid README**

In `packages/solid/README.md`, change line 87 from:
```typescript
import "@simplysm/solid/base.css";
```
to:
```typescript
import "@simplysm/solid/tailwind.css";
```

**Step 5: Verify lint**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS (CSS/md files not linted, but verify no breakage)

**Step 6: Commit**

```bash
git add packages/solid/src/base.css packages/solid/tailwind.css packages/solid/package.json packages/solid-demo/src/main.css packages/solid/README.md
git commit -m "refactor(solid): rename base.css to tailwind.css and move to package root"
```
