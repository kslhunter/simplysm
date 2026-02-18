# Remove Hardcoded `@simplysm` Scope Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Remove hardcoded `@simplysm` from watch scope logic; extract scopes from `replaceDeps` config instead.

**Architecture:** `getWatchScopes()` gains an optional `replaceDeps` parameter to extract scopes from config keys. `sdTailwindConfigDepsPlugin` receives scopes as a parameter instead of computing them internally. Callers pass the config through.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Update `getWatchScopes()` and tests

**Files:**
- Modify: `packages/sd-cli/src/utils/package-utils.ts:18-32`
- Modify: `packages/sd-cli/tests/package-utils.spec.ts`

**Step 1: Update tests**

Replace `packages/sd-cli/tests/package-utils.spec.ts` entirely:

```typescript
import { describe, it, expect } from "vitest";
import { getWatchScopes } from "../src/utils/package-utils";

describe("getWatchScopes", () => {
  it("scope가 있는 패키지명에서 scope를 추출한다", () => {
    const result = getWatchScopes("@myapp/root");
    expect(result).toEqual(["@myapp"]);
  });

  it("scope가 없는 패키지명이면 빈 배열을 반환한다", () => {
    const result = getWatchScopes("simplysm");
    expect(result).toEqual([]);
  });

  it("replaceDeps에서 scope를 추출한다", () => {
    const result = getWatchScopes("@myapp/root", { "@simplysm/*": "../simplysm/packages/*" });
    expect(result).toContain("@myapp");
    expect(result).toContain("@simplysm");
  });

  it("프로젝트 scope와 replaceDeps scope가 동일하면 중복 없이 반환한다", () => {
    const result = getWatchScopes("@simplysm/core-common", { "@simplysm/*": "../packages/*" });
    expect(result).toEqual(["@simplysm"]);
  });

  it("replaceDeps에 scope가 없는 패턴은 무시한다", () => {
    const result = getWatchScopes("@myapp/root", { "lodash": "../lodash" });
    expect(result).toEqual(["@myapp"]);
  });
});
```

**Step 2: Run tests — verify failure**

Run: `pnpm vitest packages/sd-cli/tests/package-utils.spec.ts --project=node --run`
Expected: FAIL — existing `getWatchScopes` still includes `@simplysm` hardcoded, so `toEqual(["@myapp"])` fails. New tests also fail.

**Step 3: Update implementation**

In `packages/sd-cli/src/utils/package-utils.ts`, replace lines 18-32 (the JSDoc + `getWatchScopes` function):

```typescript
/**
 * 패키지명과 replaceDeps 설정에서 watch scope 목록을 생성한다.
 * - 패키지명의 scope (예: "@myapp/root" → "@myapp")
 * - replaceDeps 키의 scope (예: "@simplysm/*" → "@simplysm")
 * @param packageName 루트 package.json의 name 필드
 * @param replaceDeps sd.config.ts의 replaceDeps 설정 (키: glob 패턴, 값: 소스 경로)
 * @returns scope 배열 (중복 제거)
 */
export function getWatchScopes(
  packageName: string,
  replaceDeps?: Record<string, string>,
): string[] {
  const scopes = new Set<string>();
  const match = packageName.match(/^(@[^/]+)\//);
  if (match != null) {
    scopes.add(match[1]);
  }
  if (replaceDeps != null) {
    for (const pattern of Object.keys(replaceDeps)) {
      const depMatch = pattern.match(/^(@[^/]+)\//);
      if (depMatch != null) {
        scopes.add(depMatch[1]);
      }
    }
  }
  return [...scopes];
}
```

**Step 4: Run tests — verify pass**

Run: `pnpm vitest packages/sd-cli/tests/package-utils.spec.ts --project=node --run`
Expected: PASS (all 5 tests)

---

### Task 2: Update `sdTailwindConfigDepsPlugin` and `createViteConfig`

**Files:**
- Modify: `packages/sd-cli/src/utils/vite-config.ts:20,27-34,334`

**Step 1: Change `sdTailwindConfigDepsPlugin` signature**

In `packages/sd-cli/src/utils/vite-config.ts`, change the function signature at line 20 from:

```typescript
function sdTailwindConfigDepsPlugin(pkgDir: string): Plugin {
```

to:

```typescript
function sdTailwindConfigDepsPlugin(pkgDir: string, scopes: string[]): Plugin {
```

Then replace lines 27-34 (the scope computation block inside `configureServer`):

```typescript
      // 현재 패키지의 scope + @simplysm 을 항상 포함
      const pkgJsonPath = path.join(pkgDir, "package.json");
      const pkgName = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")).name as string;
      const pkgScope = pkgName.match(/^(@[^/]+)\//)?.[1];
      const scopes = new Set(["@simplysm"]);
      if (pkgScope != null) {
        scopes.add(pkgScope);
      }

      const allDeps = getTailwindConfigDeps(configPath, [...scopes]);
```

with:

```typescript
      const allDeps = getTailwindConfigDeps(configPath, scopes);
```

**Step 2: Update call site in `createViteConfig`**

At line 334, change:

```typescript
      sdTailwindConfigDepsPlugin(pkgDir),
```

to:

```typescript
      ...(watchScopes != null && watchScopes.length > 0
        ? [sdTailwindConfigDepsPlugin(pkgDir, watchScopes)]
        : []),
```

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 3: Update `DevOrchestrator` call site

**Files:**
- Modify: `packages/sd-cli/src/orchestrators/DevOrchestrator.ts:164`

**Step 1: Pass `replaceDeps` to `getWatchScopes`**

At line 164, change:

```typescript
    this._watchScopes = getWatchScopes(rootPkgName);
```

to:

```typescript
    this._watchScopes = getWatchScopes(rootPkgName, this._sdConfig.replaceDeps);
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/sd-cli`
Expected: PASS

---

### Task 4: Final verification

**Step 1: Run all sd-cli tests**

Run: `pnpm vitest packages/sd-cli --project=node --run`
Expected: PASS

**Step 2: Run lint**

Run: `pnpm lint packages/sd-cli`
Expected: PASS
