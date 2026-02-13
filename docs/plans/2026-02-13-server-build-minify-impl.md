# Server Build Minify Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Enable minification and disable sourcemaps for server production builds to protect source code in external deployments.

**Architecture:** Modify the server esbuild config to add `minify: true` and remove `sourcemap`/`sourcesContent` options.

**Tech Stack:** esbuild

---

### Task 1: Enable minify and disable sourcemap for server builds

**Files:**
- Modify: `packages/sd-cli/src/utils/esbuild-config.ts:125-141`

**Step 1: Update `createServerEsbuildOptions`**

In `packages/sd-cli/src/utils/esbuild-config.ts`, modify the return object of `createServerEsbuildOptions` (lines 125-141):

Remove these two lines:
```typescript
    sourcemap: true,
    sourcesContent: false,
```

Add this line (after `format: "esm"`):
```typescript
    minify: true,
```

The result should look like:
```typescript
  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    minify: true,
    platform: "node",
    target: "node20",
    bundle: true,
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    external: options.external,
    define,
    tsconfigRaw: { compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
  };
```

**Step 2: Run typecheck to verify**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS (no type errors)

**Step 3: Run lint to verify**

Run: `pnpm lint packages/sd-cli`
Expected: PASS (no lint errors)

**Step 4: Update JSDoc comment**

Update the JSDoc for `createServerEsbuildOptions` (lines 109-116) to reflect the new behavior:

```typescript
/**
 * Server용 esbuild 설정 생성
 *
 * 서버 패키지 빌드에 사용합니다.
 * - bundle: true (모든 의존성 포함한 단일 번들)
 * - minify: true (코드 보호를 위한 압축)
 * - banner: CJS 패키지의 require() 지원을 위한 createRequire shim
 * - env를 define 옵션으로 치환 (process.env["KEY"] 형태)
 */
```
