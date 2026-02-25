# allRoutes + allFlatPerms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace broken reactive `usableRoutes` with static `allRoutes`, rename `flatPerms` to `allFlatPerms` with `requiredModulesChain`, and add `checkRouteAccess` helper.

**Architecture:** Modify `createAppStructure.ts` types and internal functions. Remove `buildUsableRoutes`, add `buildAllRoutes` (no filtering, collects module/perm info). Add `checkRouteAccess` method that uses existing `checkModules` logic per chain level. Update tests, docs, and exports.

**Tech Stack:** TypeScript, SolidJS, Vitest

---

### Task 1: Update types and rename flatPerms to allFlatPerms

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`
- Test: `packages/solid/tests/helpers/createAppStructure.spec.tsx`

**Step 1: Update types in source**

In `packages/solid/src/helpers/createAppStructure.ts`, make these type changes:

1. Add `requiredModulesChain` to `AppFlatPerm`:

```typescript
export interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];
}
```

2. Add generic + new fields to `AppRoute`:

```typescript
export interface AppRoute<TModule = string> {
  path: string;
  component: Component;
  permCode?: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];
}
```

3. Update `AppStructure` — remove `usableRoutes`, rename `flatPerms` → `allFlatPerms`, add `allRoutes` and `checkRouteAccess`:

```typescript
export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  allRoutes: AppRoute<TModule>[];
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  allFlatPerms: AppFlatPerm<TModule>[];
  checkRouteAccess(route: AppRoute<TModule>): boolean;
  getTitleChainByHref(href: string): string[];
}
```

**Step 2: Update `collectFlatPerms` to track `requiredModulesChain`**

In the `QueueItem` interface inside `collectFlatPerms`, add `requiredModulesChain`:

```typescript
interface QueueItem {
  item: AppStructureItem<TModule>;
  titleChain: string[];
  codePath: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];
}
```

Update the initial queue creation:

```typescript
const queue: QueueItem[] = items.map((item) => ({
  item,
  titleChain: [],
  codePath: "",
  modulesChain: [],
  requiredModulesChain: [],
}));
```

In the while loop, after `currModulesChain`, add:

```typescript
const currRequiredModulesChain: TModule[][] = item.requiredModules
  ? [...requiredModulesChain, item.requiredModules]
  : requiredModulesChain;
```

Update the destructuring to include `requiredModulesChain`:

```typescript
const { item, titleChain, codePath, modulesChain, requiredModulesChain } = queue.shift()!;
```

Pass `requiredModulesChain: currRequiredModulesChain` in queue pushes (group children).

Include `requiredModulesChain: currRequiredModulesChain` in result pushes (both `item.perms` and `item.subPerms` branches).

For `subPerms`, handle `subPerm.requiredModules` the same way as `subPerm.modules`:

```typescript
const subRequiredModulesChain: TModule[][] = subPerm.requiredModules
  ? [...currRequiredModulesChain, subPerm.requiredModules]
  : currRequiredModulesChain;
```

**Step 3: Write test for allFlatPerms with requiredModulesChain**

In the test file, rename all `flatPerms` references to `allFlatPerms` in existing tests (if any), then add this new test section after the existing `describe` blocks:

```tsx
describe("allFlatPerms", () => {
  it("requiredModulesChain을 계층별로 수집한다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      // order는 requiredModules: ["sales", "erp"]
      // 부모 sales는 modules: ["sales"] (requiredModules 아님)
      const orderUsePerm = result.allFlatPerms.find((p) => p.code === "/home/sales/order/use");
      expect(orderUsePerm).toBeDefined();
      expect(orderUsePerm!.modulesChain).toEqual([["sales"]]);
      expect(orderUsePerm!.requiredModulesChain).toEqual([["sales", "erp"]]);

      // invoice는 requiredModules 없음
      const invoiceUsePerm = result.allFlatPerms.find((p) => p.code === "/home/sales/invoice/use");
      expect(invoiceUsePerm).toBeDefined();
      expect(invoiceUsePerm!.modulesChain).toEqual([["sales"]]);
      expect(invoiceUsePerm!.requiredModulesChain).toEqual([]);

      dispose();
    });
  });
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=node`
Expected: The `allFlatPerms` test passes. Some `usableRoutes` tests may fail due to type changes — that's expected and will be fixed in Task 2.

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "refactor(solid): rename flatPerms to allFlatPerms, add requiredModulesChain to AppFlatPerm"
```

---

### Task 2: Add allRoutes, remove usableRoutes

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx`

**Step 1: Write tests for allRoutes**

Replace the entire `describe("usableRoutes", ...)` block in the test file with:

```tsx
describe("allRoutes", () => {
  it("모든 리프 아이템의 경로, permCode, modulesChain, requiredModulesChain을 포함한다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      expect(result.allRoutes).toEqual([
        {
          path: "/sales/invoice",
          component: DummyA,
          permCode: "/home/sales/invoice/use",
          modulesChain: [["sales"]],
          requiredModulesChain: [],
        },
        {
          path: "/sales/order",
          component: DummyB,
          permCode: "/home/sales/order/use",
          modulesChain: [["sales"]],
          requiredModulesChain: [["sales", "erp"]],
        },
        {
          path: "/admin/users",
          component: DummyC,
          permCode: undefined,
          modulesChain: [],
          requiredModulesChain: [],
        },
        {
          path: "/admin/hidden",
          component: DummyD,
          permCode: undefined,
          modulesChain: [],
          requiredModulesChain: [],
        },
      ]);

      dispose();
    });
  });

  it("component가 없는 아이템은 allRoutes에 포함되지 않는다", () => {
    createRoot((dispose) => {
      const items: AppStructureItem<string>[] = [
        {
          code: "home",
          title: "홈",
          children: [{ code: "about", title: "소개" }],
        },
      ];

      const result = createAppStructure({ items });
      expect(result.allRoutes).toEqual([]);

      dispose();
    });
  });

  it("allRoutes는 permRecord나 usableModules와 무관하게 항상 모든 route를 포함한다", () => {
    createRoot((dispose) => {
      const [modules] = createSignal<string[]>(["erp"]);
      const [perms] = createSignal<Record<string, boolean>>({
        "/home/sales/invoice/use": false,
      });

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
        permRecord: perms,
      });

      // allRoutes는 static — 필터링 없이 모든 route 포함
      expect(result.allRoutes).toHaveLength(4);
      expect(result.allRoutes.map((r) => r.path)).toEqual([
        "/sales/invoice",
        "/sales/order",
        "/admin/users",
        "/admin/hidden",
      ]);

      dispose();
    });
  });

  it("perms에 use가 없으면 permCode가 undefined다", () => {
    createRoot((dispose) => {
      const items: AppStructureItem<string>[] = [
        {
          code: "home",
          title: "홈",
          children: [
            {
              code: "page",
              title: "페이지",
              component: DummyA,
              perms: ["edit"] as ("use" | "edit")[],
            },
          ],
        },
      ];

      const result = createAppStructure({ items });
      expect(result.allRoutes[0].permCode).toBeUndefined();

      dispose();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=node`
Expected: FAIL — `allRoutes` property does not exist yet.

**Step 3: Add `buildAllRoutes` function and update `createAppStructure`**

In `createAppStructure.ts`, replace the `// ── Routes ──` section. Remove `buildUsableRoutes` entirely and add:

```typescript
// ── Routes ──

function buildAllRoutes<TModule>(
  items: AppStructureItem<TModule>[],
  routeBasePath: string,
  permBasePath: string,
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
): AppRoute<TModule>[] {
  const result: AppRoute<TModule>[] = [];

  for (const item of items) {
    const currModulesChain: TModule[][] = item.modules
      ? [...modulesChain, item.modules]
      : modulesChain;
    const currRequiredModulesChain: TModule[][] = item.requiredModules
      ? [...requiredModulesChain, item.requiredModules]
      : requiredModulesChain;

    const routePath = routeBasePath + "/" + item.code;
    const permPath = permBasePath + "/" + item.code;

    if (isGroupItem(item)) {
      result.push(
        ...buildAllRoutes(item.children, routePath, permPath, currModulesChain, currRequiredModulesChain),
      );
    } else if (item.component !== undefined) {
      result.push({
        path: routePath,
        component: item.component,
        permCode: item.perms?.includes("use") ? permPath + "/use" : undefined,
        modulesChain: currModulesChain,
        requiredModulesChain: currRequiredModulesChain,
      });
    }
  }

  return result;
}
```

In `createAppStructure` main function, replace the `usableRoutes` memo with static `allRoutes` construction:

```typescript
const allRoutes: AppRoute<TModule>[] = [];
for (const top of opts.items) {
  if (isGroupItem(top)) {
    const topModulesChain: TModule[][] = top.modules ? [[...top.modules]] : [];
    const topRequiredModulesChain: TModule[][] = top.requiredModules ? [[...top.requiredModules]] : [];
    allRoutes.push(
      ...buildAllRoutes(top.children, "", "/" + top.code, topModulesChain, topRequiredModulesChain),
    );
  }
}
```

Remove `usableRoutes` from the `createRoot` block and from the return object. The `createRoot` block now only needs `usableMenus`, `usableFlatMenus`, `usablePerms`.

Update the return object:
- Remove `usableRoutes: memos.usableRoutes`
- Add `allRoutes`
- Rename `flatPerms` → `allFlatPerms`
- Add `checkRouteAccess` (placeholder — will be implemented in Task 3)

```typescript
return {
  items: opts.items,
  allRoutes,
  usableMenus: memos.usableMenus,
  usableFlatMenus: memos.usableFlatMenus,
  usablePerms: memos.usablePerms,
  allFlatPerms,
  checkRouteAccess(_route: AppRoute<TModule>): boolean {
    return true; // placeholder — implemented in Task 3
  },
  perms: permsObj as InferPerms<TItems>,
  getTitleChainByHref(href: string): string[] {
    const codes = href.split("/").filter(Boolean);
    return findItemChainByCodes(opts.items, codes).map((item) => item.title);
  },
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=node`
Expected: All `allRoutes` tests pass. Existing `usableMenus`, `usableFlatMenus`, `perms`, `getTitleChainByHref` tests still pass.

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "feat(solid): add static allRoutes, remove reactive usableRoutes"
```

---

### Task 3: Implement checkRouteAccess

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx`

**Step 1: Write tests for checkRouteAccess**

Add after the `allRoutes` describe block:

```tsx
describe("checkRouteAccess", () => {
  it("permRecord/usableModules가 없으면 모든 route에 true를 반환한다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      for (const route of result.allRoutes) {
        expect(result.checkRouteAccess(route)).toBe(true);
      }

      dispose();
    });
  });

  it("permCode가 있고 permRecord에서 false이면 접근 불가", () => {
    createRoot((dispose) => {
      const [perms] = createSignal<Record<string, boolean>>({
        "/home/sales/invoice/use": false,
        "/home/sales/order/use": true,
      });

      const result = createAppStructure({
        items: createTestItems(),
        permRecord: perms,
      });

      const invoiceRoute = result.allRoutes.find((r) => r.path === "/sales/invoice")!;
      const orderRoute = result.allRoutes.find((r) => r.path === "/sales/order")!;
      const usersRoute = result.allRoutes.find((r) => r.path === "/admin/users")!;

      expect(result.checkRouteAccess(invoiceRoute)).toBe(false);
      expect(result.checkRouteAccess(orderRoute)).toBe(true);
      expect(result.checkRouteAccess(usersRoute)).toBe(true); // permCode 없음

      dispose();
    });
  });

  it("modulesChain: usableModules에 매칭되는 모듈이 없으면 접근 불가", () => {
    createRoot((dispose) => {
      const [modules] = createSignal<string[]>(["erp"]);

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
      });

      // sales 그룹은 modules: ["sales"] — "erp"만 있으면 접근 불가
      const invoiceRoute = result.allRoutes.find((r) => r.path === "/sales/invoice")!;
      expect(result.checkRouteAccess(invoiceRoute)).toBe(false);

      // admin은 modules 없음 — 항상 접근 가능
      const usersRoute = result.allRoutes.find((r) => r.path === "/admin/users")!;
      expect(result.checkRouteAccess(usersRoute)).toBe(true);

      dispose();
    });
  });

  it("requiredModulesChain: 필수 모듈이 모두 없으면 접근 불가", () => {
    createRoot((dispose) => {
      const [modules] = createSignal<string[]>(["sales"]);

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
      });

      // order는 requiredModules: ["sales", "erp"] — "erp"가 없으므로 접근 불가
      const orderRoute = result.allRoutes.find((r) => r.path === "/sales/order")!;
      expect(result.checkRouteAccess(orderRoute)).toBe(false);

      // invoice는 requiredModules 없음 — 접근 가능
      const invoiceRoute = result.allRoutes.find((r) => r.path === "/sales/invoice")!;
      expect(result.checkRouteAccess(invoiceRoute)).toBe(true);

      dispose();
    });
  });

  it("module과 perm 모두 충족해야 접근 가능", () => {
    createRoot((dispose) => {
      const [modules] = createSignal<string[]>(["sales", "erp"]);
      const [perms] = createSignal<Record<string, boolean>>({
        "/home/sales/invoice/use": true,
        "/home/sales/order/use": false,
      });

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
        permRecord: perms,
      });

      const invoiceRoute = result.allRoutes.find((r) => r.path === "/sales/invoice")!;
      const orderRoute = result.allRoutes.find((r) => r.path === "/sales/order")!;

      expect(result.checkRouteAccess(invoiceRoute)).toBe(true);
      expect(result.checkRouteAccess(orderRoute)).toBe(false); // perm 불충족

      dispose();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=node`
Expected: FAIL — `checkRouteAccess` always returns `true` (placeholder).

**Step 3: Implement checkRouteAccess**

Replace the placeholder in the return object of `createAppStructure`:

```typescript
checkRouteAccess(route: AppRoute<TModule>): boolean {
  const usableModules = opts.usableModules?.();
  if (usableModules !== undefined) {
    for (const modules of route.modulesChain) {
      if (modules.length > 0 && !modules.some((m) => usableModules.includes(m))) {
        return false;
      }
    }
    for (const modules of route.requiredModulesChain) {
      if (modules.length > 0 && !modules.every((m) => usableModules.includes(m))) {
        return false;
      }
    }
  }

  if (route.permCode !== undefined) {
    const permRecord = opts.permRecord?.();
    if (permRecord !== undefined) {
      return permRecord[route.permCode] ?? false;
    }
  }

  return true;
},
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=node`
Expected: ALL tests pass.

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "feat(solid): add checkRouteAccess helper to AppStructure"
```

---

### Task 4: Update docs and exports

**Files:**
- Modify: `packages/solid/src/index.ts:180-192`
- Modify: `packages/solid/docs/hooks.md:211-324`

**Step 1: Update index.ts exports**

No changes needed — the exports already use `export type { AppRoute, AppFlatPerm, AppStructure }` which will pick up the updated types automatically.

**Step 2: Update docs/hooks.md**

Replace lines 238-324 (from `const structure = createAppStructure({` through the type definitions) with updated content:

1. Update the overview comment block (lines 244-248):
```
// structure.allRoutes           -- AppRoute[] - all routes with permCode + module info (static)
// structure.usableMenus()       -- Accessor<AppMenu[]> - filtered menu array for Sidebar.Menu
// structure.usableFlatMenus()   -- Accessor<AppFlatMenu[]> - flat filtered menu list
// structure.usablePerms()       -- Accessor<AppPerm[]> - filtered permission tree
// structure.allFlatPerms        -- AppFlatPerm[] - all flat perm entries (static)
// structure.checkRouteAccess(r) -- boolean - check if route is accessible
```

2. Replace the routing integration example (lines 251-276) with the new `allRoutes` + `checkRouteAccess` pattern:
```tsx
import { render } from "solid-js/web";
import { HashRouter, Navigate, Route } from "@solidjs/router";
import { appStructure } from "./appStructure";

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        <Route path="/home" component={Home}>
          <Route path="/" component={() => <Navigate href="/home/main" />} />
          {appStructure.allRoutes.map((r) => (
            <Route
              path={r.path}
              component={() => {
                if (!appStructure.checkRouteAccess(r)) {
                  return <Navigate href="/login" />;
                }
                return <r.component />;
              }}
            />
          ))}
          <Route path="/*" component={NotFoundPage} />
        </Route>
        <Route path="/" component={() => <Navigate href="/home" />} />
      </Route>
    </HashRouter>
  ),
  document.getElementById("root")!,
);
```

3. Replace the explanation paragraph (line 278) with:
```
`allRoutes` is a static (non-reactive) array containing all routes with `permCode` and module chain information. Use `checkRouteAccess(route)` to reactively verify access based on `permRecord` and `usableModules` signals.
```

4. Update the `AppStructure` type block (lines 282-323) with the new interface and types.

**Step 3: Commit**

```bash
git add packages/solid/src/index.ts packages/solid/docs/hooks.md
git commit -m "docs(solid): update createAppStructure docs for allRoutes API"
```

---

### Task 5: Typecheck

**Step 1: Run typecheck on solid package and dependents**

Run: `pnpm typecheck packages/solid`
Expected: PASS — no type errors.

Also check demo package (if it references `flatPerms` or `usableRoutes`):
Run: `pnpm typecheck packages/solid-demo`
Expected: PASS.

**Step 2: Run lint**

Run: `pnpm lint packages/solid`
Expected: PASS.
