# createAppStructure Provider 패턴 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `createAppStructure`가 `{ AppStructureProvider, useAppStructure }`를 반환하도록 변경하여, Context 사용 시 `InferPerms` 타입이 보존되도록 한다.

**Architecture:** 기존 `createAppStructure` 내부 로직을 비공개 `buildAppStructure`로 분리하고, 새 `createAppStructure`는 `getOpts` 콜백을 받아 Provider/hook 쌍을 반환한다. 내부 로직 변경 없음.

**Tech Stack:** SolidJS (`createContext`, `useContext`, `ParentComponent`)

---

### Task 1: `createAppStructure.ts` 리팩토링

**Files:**
- Modify: `packages/solid/src/helpers/createAppStructure.ts`

**Step 1: Write the failing test**

`packages/solid/tests/helpers/createAppStructure.spec.tsx` 상단에 Provider/hook API 테스트 추가:

```typescript
// 기존 import 변경
import { createAppStructure, type AppStructureItem } from "../../src/helpers/createAppStructure";

describe("createAppStructure", () => {
  it("AppStructureProvider와 useAppStructure를 반환한다", () => {
    createRoot((dispose) => {
      const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
        items: [
          {
            code: "home",
            title: "홈",
            children: [
              { code: "user", title: "사용자", component: DummyA, perms: ["use"] as ("use" | "edit")[] },
            ],
          },
        ],
      }));

      expect(AppStructureProvider).toBeTypeOf("function");
      expect(useAppStructure).toBeTypeOf("function");

      dispose();
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --project=solid -t "AppStructureProvider와 useAppStructure를 반환한다"`
Expected: FAIL — `createAppStructure` returns `AppStructure`, not `{ AppStructureProvider, useAppStructure }`

**Step 3: Implement**

`packages/solid/src/helpers/createAppStructure.ts`:

1) import 추가:

```typescript
// 변경 전
import type { Component } from "solid-js";
import { type Accessor, createMemo, createRoot } from "solid-js";

// 변경 후
import type { Component, ParentComponent } from "solid-js";
import { type Accessor, createContext, createMemo, createRoot, useContext } from "solid-js";
```

2) 기존 `createAppStructure` 함수를 `buildAppStructure`로 이름 변경 (비공개, export 하지 않음):

```typescript
function buildAppStructure<
  TModule,
  const TItems extends AppStructureItem<TModule>[],
>(opts: {
  items: TItems;
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean> | undefined>;
}): AppStructure<TModule> & { perms: InferPerms<TItems> } {
  // 기존 로직 그대로
}
```

3) 새 `createAppStructure` 추가:

```typescript
export function createAppStructure<
  TModule,
  const TItems extends AppStructureItem<TModule>[],
>(
  getOpts: () => {
    items: TItems;
    usableModules?: Accessor<TModule[] | undefined>;
    permRecord?: Accessor<Record<string, boolean> | undefined>;
  },
): {
  AppStructureProvider: ParentComponent;
  useAppStructure: () => AppStructure<TModule> & { perms: InferPerms<TItems> };
} {
  type TRet = AppStructure<TModule> & { perms: InferPerms<TItems> };

  const Ctx = createContext<TRet>();

  const AppStructureProvider: ParentComponent = (props) => {
    const structure = buildAppStructure(getOpts());
    return <Ctx.Provider value={structure as TRet}>{props.children}</Ctx.Provider>;
  };

  const useAppStructure = (): TRet => {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("AppStructureProvider가 필요합니다.");
    return ctx;
  };

  return { AppStructureProvider, useAppStructure };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --project=solid -t "AppStructureProvider와 useAppStructure를 반환한다"`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/helpers/createAppStructure.ts packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "refactor(solid): change createAppStructure to return Provider/hook pair"
```

---

### Task 2: 기존 테스트를 새 API에 맞게 업데이트

**Files:**
- Modify: `packages/solid/tests/helpers/createAppStructure.spec.tsx`

**Step 1: 테스트 헬퍼 추가**

파일 상단 (기존 `createTestItems` 아래)에 헬퍼 함수 추가:

```typescript
function buildTestStructure(opts: {
  items: AppStructureItem<string>[];
  permRecord?: Accessor<Record<string, boolean> | undefined>;
  usableModules?: Accessor<string[] | undefined>;
}) {
  const { AppStructureProvider, useAppStructure } = createAppStructure(() => opts);

  let result!: ReturnType<typeof useAppStructure>;
  AppStructureProvider({
    get children() {
      result = useAppStructure();
      return undefined;
    },
  });

  return result;
}
```

**Step 2: 기존 테스트 일괄 변환**

모든 `createAppStructure({...})` 호출을 `buildTestStructure({...})`로 교체. 패턴:

```typescript
// 변경 전
const result = createAppStructure({ items: createTestItems() });

// 변경 후
const result = buildTestStructure({ items: createTestItems() });
```

```typescript
// 변경 전
const result = createAppStructure({
  items: createTestItems(),
  usableModules: modules,
  permRecord: perms,
});

// 변경 후
const result = buildTestStructure({
  items: createTestItems(),
  usableModules: modules,
  permRecord: perms,
});
```

인라인 items를 사용하는 테스트(perms 섹션)도 동일하게 `buildTestStructure`로 교체.

**Step 3: 전체 테스트 실행**

Run: `pnpm vitest packages/solid/tests/helpers/createAppStructure.spec.tsx --project=solid`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add packages/solid/tests/helpers/createAppStructure.spec.tsx
git commit -m "test(solid): update createAppStructure tests for new Provider/hook API"
```
