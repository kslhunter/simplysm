# Solid JSX Library Build Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Library 빌드(pnpm pub)에서 solid 패키지의 JSX가 React.createElement 대신 SolidJS 방식으로 올바르게 변환되도록 수정

**Architecture:** `esbuild-plugin-solid`를 sd-cli의 dependency로 추가하고, `createLibraryEsbuildOptions()`에서 패키지의 `solid-js` 의존성을 감지하여 자동으로 플러그인을 적용한다.

**Tech Stack:** esbuild, esbuild-plugin-solid, babel-preset-solid

---

### Task 1: Install esbuild-plugin-solid

**Files:**
- Modify: `packages/sd-cli/package.json`

**Step 1: Install the package**

Run:
```bash
cd /home/kslhunter/projects/simplysm && pnpm add esbuild-plugin-solid -w --filter @simplysm/sd-cli
```

**Step 2: Verify installation**

Run: `ls node_modules/esbuild-plugin-solid/package.json`
Expected: File exists

**Step 3: Commit**

```bash
git add packages/sd-cli/package.json pnpm-lock.yaml
git commit -m "chore(sd-cli): add esbuild-plugin-solid dependency"
```

---

### Task 2: Add SolidJS plugin to library esbuild config

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:78-90`

**Step 1: Add solid-js detection and plugin**

In `createLibraryEsbuildOptions()`, read the package's `package.json` to check for `solid-js` in `dependencies` or `peerDependencies`. If found, add `solidPlugin()` from `esbuild-plugin-solid` to the plugins array.

The existing `PkgJson` interface (line 137-141) already has `dependencies` and `peerDependencies` fields — reuse it.

```typescript
import { solidPlugin } from "esbuild-plugin-solid";

// Add this helper function (before createLibraryEsbuildOptions):
function hasSolidDependency(pkgDir: string): boolean {
  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8")) as PkgJson;
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.peerDependencies };
  return "solid-js" in allDeps;
}

// Modify createLibraryEsbuildOptions to use it:
export function createLibraryEsbuildOptions(options: LibraryEsbuildOptions): esbuild.BuildOptions {
  const plugins: esbuild.Plugin[] = [esmRelativeImportPlugin(path.join(options.pkgDir, "dist"))];

  if (hasSolidDependency(options.pkgDir)) {
    plugins.unshift(solidPlugin());
  }

  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    platform: options.target === "node" ? "node" : "browser",
    target: options.target === "node" ? "node20" : "chrome84",
    bundle: false,
    tsconfigRaw: { compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    plugins,
  };
}
```

Note: `solidPlugin()` must come BEFORE `esmRelativeImportPlugin` — solid plugin transforms JSX via Babel, then esbuild handles the rest.

**Step 2: Typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/sd-cli/src/utils/esbuild-config.ts
git commit -m "feat(sd-cli): add SolidJS JSX transform for library builds

Auto-detect solid-js in package dependencies and apply
esbuild-plugin-solid for proper JSX compilation."
```

---

### Task 3: Verify fix — build solid package and check output

**Step 1: Build the solid package**

Run:
```bash
cd /home/kslhunter/projects/simplysm && pnpm build solid
```
Expected: Build succeeds

**Step 2: Verify no React.createElement in output**

Run:
```bash
grep -r "React.createElement" packages/solid/dist/ | head -5
```
Expected: No matches (empty output)

**Step 3: Verify SolidJS template markers exist**

Run:
```bash
grep -r "_\$tmpl" packages/solid/dist/ | head -5
```
Expected: Matches found — confirms SolidJS-style compiled output

**Step 4: Spot-check a component**

Read `packages/solid/dist/components/form-control/Button.js` and verify it contains SolidJS template calls instead of `React.createElement`.

**Step 5: Commit the corrected dist (if dist is tracked)**

If dist is not gitignored, commit the fixed output. Otherwise, this step is skipped.
