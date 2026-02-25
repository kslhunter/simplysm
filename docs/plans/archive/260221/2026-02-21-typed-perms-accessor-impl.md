# Typed Perms Accessor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `createAppStructure` 반환값에 `perms` 프로퍼티를 추가하여 `appStructure.perms.home.base.user.use`처럼 dot notation으로 reactive boolean 접근 + TypeScript 자동완성을 제공한다.

**Architecture:** `const` type parameter로 items의 리터럴 타입을 추론하고, 재귀 mapped type(`InferPerms`)으로 중첩 타입을 생성한다. 런타임에서는 `Object.defineProperty` getter로 `permRecord()` signal을 읽어 SolidJS 반응성을 유지한다.

**Tech Stack:** TypeScript 5.9 (`const` type parameter), SolidJS signals, `Object.defineProperty`

**Design doc:** `docs/plans/2026-02-21-typed-perms-accessor-design.md`

---

### Task 1: Write failing tests for perms accessor

**Files:**
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx`

**Step 1: Add `describe("perms")` block with test cases**

Items을 inline으로 전달해야 `const` 제네릭이 리터럴 타입을 추론한다. 기존 `createTestItems()` 함수는 `AppStructureItem<string>[]` 반환 타입이 리터럴을 지우므로 perms 테스트에서는 사용하지 않는다.

```typescript
describe("perms", () => {
  it("permRecord에서 true인 perm은 true를 반환한다", () => {
    createRoot((dispose) => {
      const [perms] = createSignal<Record<string, boolean>>({
        "/home/sales/invoice/use": true,
        "/home/sales/invoice/edit": false,
      });

      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "sales",
                title: "영업",
                children: [
                  {
                    code: "invoice",
                    title: "송장",
                    perms: ["use", "edit"] as ("use" | "edit")[],
                  },
                ],
              },
            ],
          },
        ],
        permRecord: perms,
      });

      expect(result.perms.home.sales.invoice.use).toBe(true);
      expect(result.perms.home.sales.invoice.edit).toBe(false);

      dispose();
    });
  });

  it("permRecord에 없는 perm은 false를 반환한다", () => {
    createRoot((dispose) => {
      const [perms] = createSignal<Record<string, boolean>>({});

      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "user",
                title: "사용자",
                perms: ["use"] as ("use" | "edit")[],
              },
            ],
          },
        ],
        permRecord: perms,
      });

      expect(result.perms.home.user.use).toBe(false);

      dispose();
    });
  });

  it("permRecord가 없으면 모든 perm이 false다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "user",
                title: "사용자",
                perms: ["use"] as ("use" | "edit")[],
              },
            ],
          },
        ],
      });

      expect(result.perms.home.user.use).toBe(false);

      dispose();
    });
  });

  it("subPerms에도 동일하게 접근할 수 있다", () => {
    createRoot((dispose) => {
      const [perms] = createSignal<Record<string, boolean>>({
        "/home/user/auth/use": true,
      });

      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "user",
                title: "사용자",
                perms: ["use", "edit"] as ("use" | "edit")[],
                subPerms: [{ code: "auth", title: "권한", perms: ["use"] as ("use" | "edit")[] }],
              },
            ],
          },
        ],
        permRecord: perms,
      });

      expect(result.perms.home.user.auth.use).toBe(true);

      dispose();
    });
  });

  it("permRecord 변경 시 perm 값이 반응적으로 업데이트된다", () => {
    createRoot((dispose) => {
      const [perms, setPerms] = createSignal<Record<string, boolean>>({
        "/home/user/use": false,
      });

      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "user",
                title: "사용자",
                perms: ["use"] as ("use" | "edit")[],
              },
            ],
          },
        ],
        permRecord: perms,
      });

      expect(result.perms.home.user.use).toBe(false);

      setPerms({ "/home/user/use": true });
      expect(result.perms.home.user.use).toBe(true);

      dispose();
    });
  });

  it("perms가 없는 leaf는 perms 트리에서 제외된다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              { code: "main", title: "메인" },
              {
                code: "user",
                title: "사용자",
                perms: ["use"] as ("use" | "edit")[],
              },
            ],
          },
        ],
      });

      // user는 perms가 있으므로 포함
      expect(result.perms.home.user).toBeDefined();
      // main은 perms가 없으므로 제외 (런타임)
      expect((result.perms.home as Record<string, unknown>)["main"]).toBeUndefined();

      dispose();
    });
  });

  it("하위에 perm이 없는 group은 perms 트리에서 제외된다", () => {
    createRoot((dispose) => {
      const result = createAppStructure({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              {
                code: "empty-group",
                title: "빈그룹",
                children: [{ code: "about", title: "소개" }],
              },
              {
                code: "user",
                title: "사용자",
                perms: ["use"] as ("use" | "edit")[],
              },
            ],
          },
        ],
      });

      expect(result.perms.home.user).toBeDefined();
      expect((result.perms.home as Record<string, unknown>)["empty-group"]).toBeUndefined();

      dispose();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=solid`
Expected: FAIL — `perms` property does not exist on `AppStructure`

---

### Task 2: Implement InferPerms types

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`

**Step 1: Add type utility types after the existing output types (after line 81)**

```typescript
// ── Perms 타입 추론 ──

type PermKey<TItem> = TItem extends { code: infer C extends string }
  ? TItem extends { children: any }
    ? C
    : TItem extends { perms: any } | { subPerms: any }
      ? C
      : never
  : never;

type InferLeafPerms<TItem> = (TItem extends {
  perms: (infer P extends string)[];
}
  ? { [K in P]: boolean }
  : unknown) &
  (TItem extends { subPerms: (infer S)[] }
    ? {
        [K in S & { code: string } as K["code"]]: K extends {
          perms: (infer P extends string)[];
        }
          ? { [J in P]: boolean }
          : never;
      }
    : unknown);

type InferPerms<TItems extends any[]> = {
  [Item in TItems[number] as PermKey<Item>]: Item extends {
    children: infer C extends any[];
  }
    ? InferPerms<C>
    : InferLeafPerms<Item>;
};
```

**Step 2: Run typecheck to verify types compile**

Run: `pnpm typecheck packages/solid`
Expected: PASS (types are defined but not yet used)

---

### Task 3: Implement buildPermsObject runtime function

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`

**Step 1: Add `buildPermsObject` function in the `// ── Perms ──` section (after `collectFlatPerms`)**

```typescript
function buildPermsObject<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  permRecord?: Accessor<Record<string, boolean>>,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const item of items) {
    const path = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      const child = buildPermsObject(item.children, path, permRecord);
      if (Object.keys(child).length > 0) {
        obj[item.code] = child;
      }
    } else if (item.perms !== undefined || item.subPerms !== undefined) {
      const leaf: Record<string, unknown> = {};

      if (item.perms !== undefined) {
        for (const perm of item.perms) {
          const permPath = path + "/" + perm;
          Object.defineProperty(leaf, perm, {
            get() {
              return permRecord?.()[permPath] ?? false;
            },
            enumerable: true,
          });
        }
      }

      if (item.subPerms !== undefined) {
        for (const sub of item.subPerms) {
          const subObj: Record<string, unknown> = {};
          for (const p of sub.perms) {
            const subPermPath = path + "/" + sub.code + "/" + p;
            Object.defineProperty(subObj, p, {
              get() {
                return permRecord?.()[subPermPath] ?? false;
              },
              enumerable: true,
            });
          }
          leaf[sub.code] = subObj;
        }
      }

      obj[item.code] = leaf;
    }
  }

  return obj;
}
```

---

### Task 4: Update createAppStructure signature and return value

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`

**Step 1: Update the function signature**

Change from:
```typescript
export function createAppStructure<TModule>(opts: {
  items: AppStructureItem<TModule>[];
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean>>;
}): AppStructure<TModule> {
```

To:
```typescript
export function createAppStructure<
  TModule,
  const TItems extends AppStructureItem<TModule>[],
>(opts: {
  items: TItems;
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean>>;
}): AppStructure<TModule> & { perms: InferPerms<TItems> } {
```

**Step 2: Add `perms` to the return object**

In the return statement (around line 367), add the `perms` property:

```typescript
  const permsObj = buildPermsObject(opts.items, "", opts.permRecord);

  return {
    items: opts.items,
    usableRoutes: memos.usableRoutes,
    usableMenus: memos.usableMenus,
    usableFlatMenus: memos.usableFlatMenus,
    usablePerms: memos.usablePerms,
    flatPerms,
    getTitleChainByHref(href: string): string[] {
      const codes = href.split("/").filter(Boolean);
      return findItemChainByCodes(opts.items, codes).map((item) => item.title);
    },
    perms: permsObj as InferPerms<TItems>,
  };
```

**Step 3: Run tests**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --run --project=solid`
Expected: ALL PASS

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "feat(solid): add typed perms accessor to createAppStructure"
```

---

### Task 5: Update documentation

**Files:**
- Modify: `packages/solid/docs/hooks.md`

**Step 1: Update AppStructure return type section**

In the `AppStructure return type` code block, add:

```typescript
  perms: InferPerms<TItems>;                    // typed permission accessor (getter-based reactive booleans)
```

**Step 2: Add perms usage section**

After the existing `AppStructure return type` section, add a `#### perms` subsection:

````markdown
#### perms

Typed permission accessor providing dot-notation access with TypeScript autocompletion and reactive boolean values. Built from the `permRecord` signal using `Object.defineProperty` getters.

**Important:** For type inference to work, pass items inline to `createAppStructure`. Declaring items as a separate variable with explicit `AppStructureItem[]` type annotation widens literal types, losing autocompletion.

```typescript
const appStructure = createAppStructure({
  items: [
    {
      code: "home",
      title: "Home",
      children: [
        {
          code: "user",
          title: "User",
          perms: ["use", "edit"],
          subPerms: [
            { code: "auth", title: "Auth", perms: ["use"] },
          ],
        },
      ],
    },
  ],
  permRecord: () => userPermissions(),
});

// Typed access with autocompletion:
appStructure.perms.home.user.use        // boolean (reactive)
appStructure.perms.home.user.edit       // boolean (reactive)
appStructure.perms.home.user.auth.use   // boolean (reactive)

// Use in components:
<Show when={appStructure.perms.home.user.use}>
  <UserPage />
</Show>
```

- Leaf items without `perms`/`subPerms` are excluded from the tree
- Groups with no permission-bearing descendants are excluded
- Returns `false` when `permRecord` is not provided or key is missing
````

**Step 3: Commit**

```bash
git add packages/solid/docs/hooks.md
git commit -m "docs(solid): add perms accessor documentation to createAppStructure"
```
