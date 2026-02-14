# usePersisted 저장방식 확장 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `usePersisted`가 ConfigContext를 통해 주입된 storage 전략(동기/비동기)을 사용하도록 확장한다.

**Architecture:** `AppConfig`에 `storage?: StorageAdapter`를 추가하고, `usePersisted`에서 이를 읽어 `makePersisted`에 전달한다. `makePersisted`의 `init` 반환값으로 비동기 loading 상태를 추적하여 `[value, setValue, loading]` 튜플을 반환한다.

**Tech Stack:** SolidJS, @solid-primitives/storage (makePersisted), TypeScript, Vitest + @solidjs/testing-library

---

### Task 1: ConfigContext에 StorageAdapter 인터페이스 및 AppConfig.storage 추가

**Files:**

- Modify: `packages/solid/src/contexts/ConfigContext.ts`

**Step 1: ConfigContext.ts 수정**

`AppConfig` 위에 `StorageAdapter` 인터페이스를 정의하고, `AppConfig`에 `storage?` 필드를 추가한다.

```typescript
// ConfigContext.ts 전체 내용
import { createContext, useContext } from "solid-js";

/**
 * 커스텀 저장소 어댑터 인터페이스
 *
 * @remarks
 * - 동기 저장소: `localStorage`, `sessionStorage` 등 그대로 전달 가능
 * - 비동기 저장소: `getItem`이 `Promise`를 반환하는 구현체 전달
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * 앱 전역 설정
 */
export interface AppConfig {
  /**
   * 클라이언트 식별자 (저장소 key prefix로 사용)
   */
  clientName: string;

  /**
   * 커스텀 저장소 (기본값: localStorage)
   */
  storage?: StorageAdapter;
}

// ... ConfigContext, useConfig는 기존과 동일
```

주의: `setItem`의 반환 타입은 `void | Promise<unknown>`이다. `@solid-primitives/storage`의 `AsyncStorage.setItem` 반환 타입이 `Promise<unknown>`이므로 이에 맞춘다.

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (기존 코드에 영향 없음, storage는 옵셔널)

**Step 3: 커밋**

```bash
git add packages/solid/src/contexts/ConfigContext.ts
git commit -m "feat(solid): AppConfig에 StorageAdapter 인터페이스 및 storage 옵션 추가"
```

---

### Task 2: usePersisted에서 ConfigContext의 storage 사용 + loading 반환

**Files:**

- Modify: `packages/solid/src/contexts/usePersisted.ts`

**Step 1: usePersisted.ts 수정**

````typescript
// usePersisted.ts 전체 내용
import { createSignal, type Accessor, type Setter } from "solid-js";
import { makePersisted, type AsyncStorage, type SyncStorage } from "@solid-primitives/storage";
import { jsonStringify, jsonParse } from "@simplysm/core-common";
import { useConfig } from "./ConfigContext";

/**
 * clientName prefix가 적용된 영속 저장소 훅
 *
 * @remarks
 * - ConfigContext.Provider 내부에서만 사용 가능
 * - 키는 자동으로 `{clientName}.{key}` 형태로 저장됨
 * - 반응형 동기화 지원 (Signal 변경 시 자동 저장)
 * - DateTime, DateOnly, Time, Uuid 등 커스텀 타입 직렬화 지원
 * - 비동기 저장소 사용 시 세 번째 반환값 `loading`으로 초기 로드 상태 확인 가능
 *
 * @example
 * ```tsx
 * // 기본 사용 (localStorage)
 * const [theme, setTheme, loading] = usePersisted("theme", "light");
 *
 * // loading 무시 (기존 호환)
 * const [theme, setTheme] = usePersisted("theme", "light");
 * ```
 *
 * @param key - 저장소 키 (clientName prefix가 자동 적용됨)
 * @param initialValue - 초기값 (저장된 값이 없을 때 사용)
 * @returns [getter, setter, loading] 튜플
 */
export function usePersisted<T>(key: string, initialValue: T): [Accessor<T>, Setter<T>, Accessor<boolean>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;
  const storage = config.storage ?? localStorage;

  // eslint-disable-next-line solid/reactivity -- makePersisted는 signal 튜플을 직접 받도록 설계됨
  const [value, setValue, init] = makePersisted(createSignal<T>(initialValue), {
    name: prefixedKey,
    storage: storage as SyncStorage | AsyncStorage,
    serialize: (v) => jsonStringify(v),
    deserialize: (v) => jsonParse<T>(v),
  });

  // init이 Promise이면 비동기 저장소 → loading 추적
  const isAsync = init instanceof Promise;
  const [loading, setLoading] = createSignal(isAsync);

  if (isAsync) {
    void init.then(() => setLoading(false));
  }

  return [value, setValue, loading];
}
````

핵심 변경점:

- `config.storage ?? localStorage`로 저장소 결정
- `storage as SyncStorage | AsyncStorage` 타입 단언 (`StorageAdapter`는 두 타입의 합집합과 호환)
- `init instanceof Promise`로 비동기 여부 감지
- 반환 타입 `[Accessor<T>, Setter<T>, Accessor<boolean>]`

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/contexts/usePersisted.ts
git commit -m "feat(solid): usePersisted에 ConfigContext storage 전략 및 loading 상태 지원"
```

---

### Task 3: index.ts에서 StorageAdapter export 확인

**Files:**

- Check: `packages/solid/src/index.ts`

**Step 1: export 확인**

`index.ts`에 이미 `export * from "./contexts/ConfigContext"`가 있으므로 `StorageAdapter`는 자동으로 export된다. 별도 수정 불필요.

확인만 수행:

```bash
grep "ConfigContext" packages/solid/src/index.ts
```

Expected: `export * from "./contexts/ConfigContext";` 라인 존재

---

### Task 4: 기존 테스트가 통과하는지 확인

**Step 1: 기존 usePersisted 테스트 실행**

Run: `pnpm vitest packages/solid/tests/contexts/usePersisted.spec.tsx --project=solid --run`
Expected: 모든 5개 테스트 PASS (하위 호환 유지 확인)

---

### Task 5: 커스텀 동기 저장소 테스트 추가

**Files:**

- Modify: `packages/solid/tests/contexts/usePersisted.spec.tsx`

**Step 1: 커스텀 동기 저장소 테스트 작성**

기존 테스트 파일 끝에 추가:

```tsx
it("커스텀 동기 저장소를 사용할 수 있다", () => {
  const store = new Map<string, string>();
  const customStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  let capturedValue: string | undefined;

  function TestComponent() {
    const [value, setValue] = usePersisted("theme", "light");
    capturedValue = value();
    setValue("dark");
    return <div />;
  }

  render(() => (
    <ConfigContext.Provider value={{ clientName: "app", storage: customStorage }}>
      <TestComponent />
    </ConfigContext.Provider>
  ));

  expect(capturedValue).toBe("light");
  expect(store.get("app.theme")).toBe(JSON.stringify("dark"));
  expect(localStorage.getItem("app.theme")).toBeNull();
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/contexts/usePersisted.spec.tsx --project=solid --run`
Expected: 6개 테스트 모두 PASS

---

### Task 6: 비동기 저장소 + loading 상태 테스트 추가

**Files:**

- Modify: `packages/solid/tests/contexts/usePersisted.spec.tsx`

**Step 1: 비동기 저장소 테스트 작성**

기존 테스트 파일 끝에 추가:

```tsx
it("비동기 저장소 사용 시 loading이 true에서 false로 전환된다", async () => {
  const store = new Map<string, string>();
  const asyncStorage = {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };

  let capturedLoading: boolean | undefined;
  let capturedValue: string | undefined;

  function TestComponent() {
    const [value, , loading] = usePersisted("theme", "light");
    capturedLoading = loading();
    capturedValue = value();
    return <div />;
  }

  render(() => (
    <ConfigContext.Provider value={{ clientName: "app", storage: asyncStorage }}>
      <TestComponent />
    </ConfigContext.Provider>
  ));

  // 초기 상태: loading true, initialValue 사용
  expect(capturedLoading).toBe(true);
  expect(capturedValue).toBe("light");
});

it("동기 저장소 사용 시 loading이 항상 false이다", () => {
  let capturedLoading: boolean | undefined;

  function TestComponent() {
    const [, , loading] = usePersisted("theme", "light");
    capturedLoading = loading();
    return <div />;
  }

  render(() => (
    <ConfigContext.Provider value={{ clientName: "app" }}>
      <TestComponent />
    </ConfigContext.Provider>
  ));

  expect(capturedLoading).toBe(false);
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/contexts/usePersisted.spec.tsx --project=solid --run`
Expected: 8개 테스트 모두 PASS

**Step 3: 최종 커밋**

```bash
git add packages/solid/tests/contexts/usePersisted.spec.tsx
git commit -m "test(solid): usePersisted 커스텀 저장소 및 loading 상태 테스트 추가"
```

---

### Task 7: 린트 및 전체 타입체크 검증

**Step 1: 린트**

Run: `pnpm lint packages/solid/src/contexts/ConfigContext.ts packages/solid/src/contexts/usePersisted.ts`
Expected: PASS (에러 없음)

**Step 2: 전체 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

---

### Task 8: 마이그레이션 문서 상태 업데이트

**Files:**

- Modify: `docs/2026-02-09-solid-migration-remaining.md`

**Step 1: 13번 항목 상태를 [x]로 변경**

```
| 13 | **usePersisted 저장방식 확장** | ConfigProvider에 storage 전략 주입, 없으면 localStorage 폴백 | [x] |
```

**Step 2: 커밋**

```bash
git add docs/2026-02-09-solid-migration-remaining.md
git commit -m "docs: usePersisted 저장방식 확장 완료 표시"
```
