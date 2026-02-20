# usableRoutes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace static `routes: AppRoute[]` with reactive `usableRoutes: Accessor<AppRoute[]>` filtered by module + perm.

**Architecture:** Replace `collectRoutes`/`extractRoutes` with `buildUsableRoutes` that applies the same module+perm filtering as `buildMenus`. Wrap in `createMemo` inside `createRoot` to make it reactive.

**Tech Stack:** SolidJS (createMemo, createRoot), TypeScript

---

### Task 1: Write failing tests for usableRoutes

**Files:**
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx:62-93`

**Step 1: Update existing routes tests to use `usableRoutes()` and add filtering tests**

Replace the existing `describe("routes", ...)` block (lines 62-93) with:

```typescript
describe("usableRoutes", () => {
  it("모듈/권한 필터 없이 모든 리프 아이템의 경로를 추출한다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      expect(result.usableRoutes()).toEqual([
        { path: "/sales/invoice", component: DummyA },
        { path: "/sales/order", component: DummyB },
        { path: "/admin/users", component: DummyC },
        { path: "/admin/hidden", component: DummyD },
      ]);

      dispose();
    });
  });

  it("component가 없는 아이템은 라우트에 포함되지 않는다", () => {
    createRoot((dispose) => {
      const items: AppStructureItem<string>[] = [
        {
          code: "home",
          title: "홈",
          children: [{ code: "about", title: "소개" }],
        },
      ];

      const result = createAppStructure({ items });
      expect(result.usableRoutes()).toEqual([]);

      dispose();
    });
  });

  it("모듈 필터링: usableModules에 없는 모듈의 route가 제외된다", () => {
    createRoot((dispose) => {
      const [modules] = createSignal<string[]>(["erp"]);

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
      });

      // sales 그룹(modules: ["sales"])은 usableModules에 없으므로 하위 route 전체 제외
      // admin 하위만 남음
      expect(result.usableRoutes()).toEqual([
        { path: "/admin/users", component: DummyC },
        { path: "/admin/hidden", component: DummyD },
      ]);

      dispose();
    });
  });

  it("requiredModules 필터링: 모든 필수 모듈이 있어야 route에 포함된다", () => {
    createRoot((dispose) => {
      const [modules] = createSignal<string[]>(["sales"]);

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
      });

      // order는 requiredModules: ["sales", "erp"]인데 "erp"가 없으므로 제외
      // invoice는 requiredModules 없으므로 포함
      expect(result.usableRoutes()).toEqual([
        { path: "/sales/invoice", component: DummyA },
        { path: "/admin/users", component: DummyC },
        { path: "/admin/hidden", component: DummyD },
      ]);

      dispose();
    });
  });

  it("perm 필터링: use 권한이 없으면 route에서 제외된다", () => {
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

      // order는 perms: ["use"]이고 permRecord에서 false → 제외
      expect(result.usableRoutes()).toEqual([
        { path: "/sales/invoice", component: DummyA },
        { path: "/admin/users", component: DummyC },
        { path: "/admin/hidden", component: DummyD },
      ]);

      dispose();
    });
  });

  it("isNotMenu 아이템도 route에는 포함된다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      const hiddenRoute = result.usableRoutes().find((r) => r.path === "/admin/hidden");
      expect(hiddenRoute).toBeDefined();
      expect(hiddenRoute!.component).toBe(DummyD);

      dispose();
    });
  });

  it("usableModules가 변경되면 routes가 재계산된다", () => {
    createRoot((dispose) => {
      const [modules, setModules] = createSignal<string[] | undefined>(undefined);

      const result = createAppStructure({
        items: createTestItems(),
        usableModules: modules,
      });

      // undefined → 모듈 필터링 없음 → 전부 포함
      expect(result.usableRoutes()).toHaveLength(4);

      // ["erp"]로 변경 → sales 그룹 제외
      setModules(["erp"]);
      expect(result.usableRoutes()).toHaveLength(2);
      expect(result.usableRoutes().map((r) => r.path)).toEqual([
        "/admin/users",
        "/admin/hidden",
      ]);

      dispose();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=solid`
Expected: FAIL — `result.usableRoutes` is not a function (property `routes` still exists, `usableRoutes` does not)

---

### Task 2: Implement usableRoutes

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`

**Step 1: Replace `AppStructure.routes` with `usableRoutes` in interface (line 75)**

Change:
```typescript
routes: AppRoute[];
```
to:
```typescript
usableRoutes: Accessor<AppRoute[]>;
```

**Step 2: Replace `collectRoutes`/`extractRoutes` (lines 109-155) with `buildUsableRoutes`**

Delete the `// ── Routes ──` section (lines 109-155) and replace with:

```typescript
// ── Routes ──

function buildUsableRoutes<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
  permRecord: Record<string, boolean>,
): AppRoute[] {
  const result: AppRoute[] = [];

  for (const item of items) {
    if (!checkModules(item.modules, item.requiredModules, usableModules)) continue;

    const path = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      result.push(...buildUsableRoutes(item.children, path, usableModules, permRecord));
    } else if (item.component !== undefined) {
      if (item.perms?.includes("use") && !permRecord[path + "/use"]) continue;
      result.push({ path, component: item.component });
    }
  }

  return result;
}
```

**Step 3: Update `createAppStructure` function body**

Remove static `routes` line (line 324):
```typescript
const routes = extractRoutes(opts.items);
```

Add `usableRoutes` memo inside `createRoot` (after `usableFlatMenus`):

```typescript
const usableRoutes = createMemo(() => {
  const routes: AppRoute[] = [];
  for (const top of opts.items) {
    if (isGroupItem(top)) {
      routes.push(
        ...buildUsableRoutes(top.children, "/" + top.code, opts.usableModules?.(), permRecord()),
      );
    }
  }
  return routes;
});
```

Update `memos` return to include `usableRoutes`:
```typescript
return { usableRoutes, usableMenus, usableFlatMenus, usablePerms };
```

Update final return object — replace `routes,` with:
```typescript
usableRoutes: memos.usableRoutes,
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=solid`
Expected: ALL PASS

**Step 5: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS (no external consumers in this repo reference `routes` directly)
