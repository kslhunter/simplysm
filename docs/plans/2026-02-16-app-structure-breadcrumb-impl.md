# AppStructure Breadcrumb Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add `getTitleChainByHref(href)` to `createAppStructure` return, enabling topbar header breadcrumb display.

**Architecture:** Add an internal helper `findItemChainByCodes` that walks the items tree matching code segments from an href. Expose `getTitleChainByHref` on the `AppStructure` return object. This works on the raw items (not filtered menus), so even `isNotMenu` items are found.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

### Task 1: Write failing tests for `getTitleChainByHref`

**Files:**
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx`

**Step 1: Write the failing tests**

Add a new `describe` block after the existing `usableFlatMenus` block:

```typescript
describe("getTitleChainByHref", () => {
  it("href에서 title 체인을 반환한다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      expect(result.getTitleChainByHref("/home/sales/invoice")).toEqual(["홈", "영업", "송장"]);
      expect(result.getTitleChainByHref("/home/admin/users")).toEqual(["홈", "관리", "사용자"]);

      dispose();
    });
  });

  it("isNotMenu 아이템도 찾는다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      expect(result.getTitleChainByHref("/home/admin/hidden")).toEqual(["홈", "관리", "숨김"]);

      dispose();
    });
  });

  it("존재하지 않는 href는 빈 배열을 반환한다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({ items: createTestItems() });

      expect(result.getTitleChainByHref("/home/nonexistent")).toEqual(["홈"]);
      expect(result.getTitleChainByHref("/totally/wrong")).toEqual([]);

      dispose();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=solid`
Expected: FAIL — `getTitleChainByHref` is not a function

**Step 3: Commit**

```bash
git add packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "test(solid): add failing tests for getTitleChainByHref"
```

---

### Task 2: Implement `getTitleChainByHref`

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`

**Step 1: Add internal helper `findItemChainByCodes`**

Add before `// ── 메인 함수 ──`:

```typescript
function findItemChainByCodes<TModule>(
  items: AppStructureItem<TModule>[],
  codes: string[],
): AppStructureItem<TModule>[] {
  const result: AppStructureItem<TModule>[] = [];

  let currentItems = items;
  for (const code of codes) {
    const found = currentItems.find((item) => item.code === code);
    if (found === undefined) break;
    result.push(found);
    currentItems = isGroupItem(found) ? found.children : [];
  }

  return result;
}
```

**Step 2: Add `getTitleChainByHref` to `AppStructure` interface and return**

Update `AppStructure` interface:

```typescript
export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  routes: AppRoute[];
  usableMenus: Accessor<SidebarMenuItem[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  permRecord: Accessor<Record<string, boolean>>;
  getTitleChainByHref(href: string): string[];
}
```

Add to `createAppStructure` return:

```typescript
return {
  items: opts.items,
  routes,
  usableMenus,
  usableFlatMenus,
  permRecord,
  getTitleChainByHref(href: string): string[] {
    const codes = href.split("/").filter(Boolean);
    return findItemChainByCodes(opts.items, codes).map((item) => item.title);
  },
};
```

**Step 3: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=solid`
Expected: PASS

**Step 4: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts
git commit -m "feat(solid): add getTitleChainByHref to createAppStructure"
```

---

### Task 3: Update README.md

**Files:**
- Modify: `packages/solid/README.md`

**Step 1: Add `getTitleChainByHref` documentation**

Find the `createAppStructure` section in the README and add:

```markdown
#### getTitleChainByHref

Retrieves the breadcrumb title chain for a given href path. Works on raw items (including `isNotMenu` items).

```typescript
const appStructure = createAppStructure({ items });

// Returns ["Sales", "Invoice"] for /home/sales/invoice
const titles = appStructure.getTitleChainByHref("/home/sales/invoice");

// Use with router for dynamic breadcrumb
const location = useLocation();
const breadcrumb = () => appStructure.getTitleChainByHref(location.pathname);
```
```

**Step 2: Commit**

```bash
git add packages/solid/README.md
git commit -m "docs(solid): document getTitleChainByHref in README"
```
