# SharedDataProvider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 서버 마스터 데이터를 캐싱하고 WebSocket으로 실시간 동기화하는 SharedDataProvider 구현

**Architecture:** SolidJS Context + createSignal 기반. Provider에 definitions props로 데이터 소스 등록, useSharedData<T>() hook으로 타입 안전한 접근. ServiceClient의 이벤트 시스템으로 클라이언트 간 실시간 동기화.

**Tech Stack:** SolidJS (createContext, createSignal, createMemo, onCleanup), @simplysm/service-client (ServiceClient), @simplysm/service-common (ServiceEventListener), @simplysm/core-common (objEqual, waitUntil, Array.orderBy)

**Design doc:** `docs/plans/2026-02-10-shared-data-provider-design.md`

---

### Task 1: SharedDataChangeEvent 이벤트 클래스

**Files:**

- Create: `packages/solid/src/contexts/shared-data/SharedDataChangeEvent.ts`

**Step 1: 이벤트 클래스 작성**

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

export class SharedDataChangeEvent extends ServiceEventListener<
  { name: string; filter: unknown },
  (string | number)[] | undefined
> {
  readonly eventName = "SharedDataChangeEvent";
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/contexts/shared-data/SharedDataChangeEvent.ts
git commit -m "feat(solid): SharedDataChangeEvent 이벤트 클래스 추가"
```

---

### Task 2: SharedDataContext — 타입 및 Hook

**Files:**

- Create: `packages/solid/src/contexts/shared-data/SharedDataContext.ts`

**Step 1: 타입 정의 및 Context/Hook 작성**

참고 패턴: `packages/solid/src/contexts/ServiceClientContext.ts`

```typescript
import { type Accessor, createContext, useContext } from "solid-js";

export interface SharedDataDefinition<T> {
  serviceKey: string;
  fetch: (changeKeys?: Array<string | number>) => Promise<T[]>;
  getKey: (item: T) => string | number;
  orderBy: [(item: T) => unknown, "asc" | "desc"][];
  filter?: unknown;
}

export interface SharedDataAccessor<T> {
  items: Accessor<T[]>;
  get: (key: string | number | undefined) => T | undefined;
  emit: (changeKeys?: Array<string | number>) => Promise<void>;
}

export type SharedDataValue<T extends Record<string, unknown>> = {
  [K in keyof T]: SharedDataAccessor<T[K]>;
} & {
  wait: () => Promise<void>;
  loading: Accessor<boolean>;
};

// Context는 any로 생성 (제네릭 Context는 SolidJS에서 불가)
// useSharedData에서 제네릭 캐스팅으로 타입 안전성 보장
export const SharedDataContext = createContext<SharedDataValue<Record<string, unknown>>>();

export function useSharedData<T extends Record<string, unknown> = Record<string, unknown>>(): SharedDataValue<T> {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error("useSharedData는 SharedDataProvider 내부에서만 사용할 수 있습니다");
  }
  return context as unknown as SharedDataValue<T>;
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/contexts/shared-data/SharedDataContext.ts
git commit -m "feat(solid): SharedDataContext 타입 및 useSharedData hook 추가"
```

---

### Task 3: SharedDataProvider — 핵심 구현

**Files:**

- Create: `packages/solid/src/contexts/shared-data/SharedDataProvider.tsx`

**Step 1: Provider 컴포넌트 작성**

참고 패턴: `packages/solid/src/contexts/ServiceClientProvider.tsx`
참고 레거시: `.legacy-packages/sd-angular/src/core/providers/storage/sd-shared-data.provider.ts`

```tsx
import { type Accessor, type JSX, createMemo, createSignal, onCleanup } from "solid-js";
import { objEqual, waitUntil } from "@simplysm/core-common";
import {
  SharedDataContext,
  type SharedDataAccessor,
  type SharedDataDefinition,
  type SharedDataValue,
} from "./SharedDataContext";
import { SharedDataChangeEvent } from "./SharedDataChangeEvent";
import { useServiceClient } from "../ServiceClientContext";

export function SharedDataProvider<T extends Record<string, unknown>>(props: {
  definitions: { [K in keyof T]: SharedDataDefinition<T[K]> };
  children: JSX.Element;
}): JSX.Element {
  const serviceClient = useServiceClient();

  const [loadingCount, setLoadingCount] = createSignal(0);
  const loading: Accessor<boolean> = () => loadingCount() > 0;

  // 각 definition에 대한 Signal/Memo/ListenerKey 저장소
  const signalMap = new Map<string, ReturnType<typeof createSignal<unknown[]>>>();
  const memoMap = new Map<string, Accessor<Map<string | number, unknown>>>();
  const listenerKeyMap = new Map<string, string>();

  // 정렬 함수
  function ordering<TT>(data: TT[], orderByList: [(item: TT) => unknown, "asc" | "desc"][]): TT[] {
    let result = [...data];
    for (const orderBy of [...orderByList].reverse()) {
      if (orderBy[1] === "desc") {
        result = result.orderByDesc((item) => orderBy[0](item));
      } else {
        result = result.orderBy((item) => orderBy[0](item));
      }
    }
    return result;
  }

  // 데이터 로드 함수
  async function loadData(
    name: string,
    def: SharedDataDefinition<unknown>,
    changeKeys?: Array<string | number>,
  ): Promise<void> {
    setLoadingCount((c) => c + 1);
    try {
      const signal = signalMap.get(name);
      if (!signal) throw new Error(`'${name}'에 대한 공유데이터 저장소가 없습니다.`);

      const [, setItems] = signal;
      const resData = await def.fetch(changeKeys);

      if (!changeKeys) {
        setItems(ordering(resData, def.orderBy));
      } else {
        setItems((prev) => {
          const filtered = (prev as unknown[]).filter((item) => !changeKeys.includes(def.getKey(item as never)));
          filtered.push(...resData);
          return ordering(filtered, def.orderBy);
        });
      }
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }

  // wait: 모든 데이터 로드 완료 대기
  async function wait(): Promise<void> {
    await waitUntil(() => loadingCount() <= 0);
  }

  // 각 definition 초기화
  const accessors: Record<string, SharedDataAccessor<unknown>> = {};

  for (const [name, def] of Object.entries(props.definitions) as [string, SharedDataDefinition<unknown>][]) {
    // Signal 생성
    const signal = createSignal<unknown[]>([]);
    signalMap.set(name, signal);
    const [items] = signal;

    // Map 캐시 (O(1) 조회용)
    const itemMap = createMemo(() => {
      const map = new Map<string | number, unknown>();
      for (const item of items()) {
        map.set(def.getKey(item as never), item);
      }
      return map;
    });
    memoMap.set(name, itemMap);

    // WebSocket 이벤트 리스너 등록
    const client = serviceClient.get(def.serviceKey);
    void client
      .addEventListener(SharedDataChangeEvent, { name, filter: def.filter }, async (changeKeys) => {
        await loadData(name, def, changeKeys);
      })
      .then((key) => {
        listenerKeyMap.set(name, key);
      });

    // 초기 데이터 로드 (병렬, fire-and-forget)
    void loadData(name, def);

    // Accessor 생성
    accessors[name] = {
      items: items as Accessor<unknown[]>,
      get: (key: string | number | undefined) => {
        if (key === undefined) return undefined;
        return itemMap().get(key);
      },
      emit: async (changeKeys?: Array<string | number>) => {
        await client.emitToServer(
          SharedDataChangeEvent,
          (info) => info.name === name && objEqual(info.filter, def.filter),
          changeKeys,
        );
      },
    };
  }

  // cleanup: 이벤트 리스너 해제
  onCleanup(() => {
    for (const [name] of Object.entries(props.definitions)) {
      const listenerKey = listenerKeyMap.get(name);
      if (listenerKey != null) {
        const def = (props.definitions as Record<string, SharedDataDefinition<unknown>>)[name];
        const client = serviceClient.get(def.serviceKey);
        void client.removeEventListener(listenerKey);
      }
    }
  });

  // Context value 구성
  const contextValue = {
    ...accessors,
    wait,
    loading,
  } as SharedDataValue<Record<string, unknown>>;

  return <SharedDataContext.Provider value={contextValue}>{props.children}</SharedDataContext.Provider>;
}
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 린트**

Run: `pnpm lint packages/solid/src/contexts/shared-data/`
Expected: PASS (경고/에러 없음)

**Step 4: 커밋**

```bash
git add packages/solid/src/contexts/shared-data/SharedDataProvider.tsx
git commit -m "feat(solid): SharedDataProvider 핵심 구현"
```

---

### Task 4: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`// contexts` 섹션 (78행 `ServiceClientProvider` 다음)에 추가:

```typescript
export * from "./contexts/shared-data/SharedDataContext";
export * from "./contexts/shared-data/SharedDataProvider";
export * from "./contexts/shared-data/SharedDataChangeEvent";
```

**Step 2: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): SharedData 관련 export 추가"
```

---

### Task 5: 단위 테스트

**Files:**

- Create: `packages/solid/tests/SharedDataProvider.spec.tsx`

**Step 1: 테스트 작성**

테스트 환경: `--project=solid` (Playwright + vite-plugin-solid)

```tsx
import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SharedDataProvider, useSharedData, type SharedDataDefinition } from "../src";

// Mock ServiceClientProvider — useServiceClient가 필요하므로 Context를 직접 제공
import { ServiceClientContext, type ServiceClientContextValue } from "../src";

interface TestData {
  user: { id: number; name: string };
}

function createMockServiceClient() {
  const listeners = new Map<string, (data: unknown) => PromiseLike<void>>();
  let listenerCounter = 0;

  const mockClient = {
    addEventListener: vi.fn(async (_type: unknown, _info: unknown, cb: (data: unknown) => PromiseLike<void>) => {
      const key = String(listenerCounter++);
      listeners.set(key, cb);
      return key;
    }),
    removeEventListener: vi.fn(async (_key: string) => {}),
    emitToServer: vi.fn(async () => {}),
  };

  const serviceClientValue: ServiceClientContextValue = {
    connect: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    get: () => mockClient as never,
    isConnected: () => true,
  };

  return { mockClient, serviceClientValue, listeners };
}

function TestConsumer(props: { onData?: (shared: ReturnType<typeof useSharedData<TestData>>) => void }) {
  const shared = useSharedData<TestData>();
  props.onData?.(shared);

  return (
    <div>
      <span data-testid="count">{shared.user.items().length}</span>
      <span data-testid="loading">{shared.loading() ? "true" : "false"}</span>
    </div>
  );
}

describe("SharedDataProvider", () => {
  it("초기 데이터를 로드하고 items()로 접근할 수 있다", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const definitions: { user: SharedDataDefinition<{ id: number; name: string }> } = {
      user: {
        serviceKey: "main",
        fetch: vi.fn(async () => mockUsers),
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    const result = render(() => (
      <ServiceClientContext.Provider value={serviceClientValue}>
        <SharedDataProvider<TestData> definitions={definitions}>
          <TestConsumer />
        </SharedDataProvider>
      </ServiceClientContext.Provider>
    ));

    // 비동기 로드 대기
    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("2");
    });

    result.unmount();
  });

  it("get()으로 O(1) 단일 항목 조회가 가능하다", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    let sharedRef: ReturnType<typeof useSharedData<TestData>> | undefined;

    const definitions: { user: SharedDataDefinition<{ id: number; name: string }> } = {
      user: {
        serviceKey: "main",
        fetch: vi.fn(async () => mockUsers),
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    const result = render(() => (
      <ServiceClientContext.Provider value={serviceClientValue}>
        <SharedDataProvider<TestData> definitions={definitions}>
          <TestConsumer
            onData={(s) => {
              sharedRef = s;
            }}
          />
        </SharedDataProvider>
      </ServiceClientContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("2");
    });

    expect(sharedRef!.user.get(1)).toEqual({ id: 1, name: "Alice" });
    expect(sharedRef!.user.get(999)).toBeUndefined();
    expect(sharedRef!.user.get(undefined)).toBeUndefined();

    result.unmount();
  });

  it("orderBy에 따라 정렬된 결과를 반환한다", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers = [
      { id: 2, name: "Charlie" },
      { id: 1, name: "Alice" },
      { id: 3, name: "Bob" },
    ];

    let sharedRef: ReturnType<typeof useSharedData<TestData>> | undefined;

    const definitions: { user: SharedDataDefinition<{ id: number; name: string }> } = {
      user: {
        serviceKey: "main",
        fetch: vi.fn(async () => mockUsers),
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    const result = render(() => (
      <ServiceClientContext.Provider value={serviceClientValue}>
        <SharedDataProvider<TestData> definitions={definitions}>
          <TestConsumer
            onData={(s) => {
              sharedRef = s;
            }}
          />
        </SharedDataProvider>
      </ServiceClientContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("3");
    });

    const names = sharedRef!.user.items().map((u) => u.name);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);

    result.unmount();
  });

  it("loading()은 로드 중 true, 완료 후 false", async () => {
    const { serviceClientValue } = createMockServiceClient();

    let resolveUsers!: (value: { id: number; name: string }[]) => void;
    const fetchPromise = new Promise<{ id: number; name: string }[]>((resolve) => {
      resolveUsers = resolve;
    });

    const definitions: { user: SharedDataDefinition<{ id: number; name: string }> } = {
      user: {
        serviceKey: "main",
        fetch: vi.fn(async () => fetchPromise),
        getKey: (item) => item.id,
        orderBy: [],
      },
    };

    const result = render(() => (
      <ServiceClientContext.Provider value={serviceClientValue}>
        <SharedDataProvider<TestData> definitions={definitions}>
          <TestConsumer />
        </SharedDataProvider>
      </ServiceClientContext.Provider>
    ));

    // 로딩 중
    await vi.waitFor(() => {
      expect(result.getByTestId("loading").textContent).toBe("true");
    });

    // 로드 완료
    resolveUsers([{ id: 1, name: "Alice" }]);

    await vi.waitFor(() => {
      expect(result.getByTestId("loading").textContent).toBe("false");
    });

    result.unmount();
  });
});
```

**Step 2: 테스트 실행 (실패 확인 → 이미 구현되어 있으므로 패스해야 함)**

Run: `pnpm vitest packages/solid/tests/SharedDataProvider.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/tests/SharedDataProvider.spec.tsx
git commit -m "test(solid): SharedDataProvider 단위 테스트 추가"
```

---

### Task 6: 최종 검증

**Step 1: 전체 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 2: 전체 린트**

Run: `pnpm lint packages/solid/src/contexts/shared-data/`
Expected: PASS

**Step 3: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/SharedDataProvider.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

---

## 참조 파일

| 용도               | 경로                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| Context 패턴 참조  | `packages/solid/src/contexts/ServiceClientContext.ts`                               |
| Provider 패턴 참조 | `packages/solid/src/contexts/ServiceClientProvider.tsx`                             |
| 레거시 원본        | `.legacy-packages/sd-angular/src/core/providers/storage/sd-shared-data.provider.ts` |
| 이벤트 타입 기반   | `packages/service-common/src/types.ts` (ServiceEventListener)                       |
| ServiceClient API  | `packages/service-client/src/service-client.ts` (addEventListener, emitToServer)    |
| Array 확장 메서드  | `packages/core-common/src/extensions/arr-ext.ts` (orderBy, orderByDesc)             |
| 유틸 함수          | `packages/core-common/src/utils/obj.ts` (objEqual), `wait.ts` (waitUntil)           |

## import 요약

```typescript
// solid-js
import { type Accessor, type JSX, createContext, useContext, createSignal, createMemo, onCleanup } from "solid-js";

// @simplysm/core-common
import { objEqual, waitUntil } from "@simplysm/core-common";
// Array.orderBy(), Array.orderByDesc()는 확장 메서드 (import 필요 없음, core-common import 시 자동 활성화)

// @simplysm/service-common
import { ServiceEventListener } from "@simplysm/service-common";

// @simplysm/service-client
import type { ServiceClient } from "@simplysm/service-client";

// 내부
import { useServiceClient } from "../ServiceClientContext";
```
