# SharedDataProvider Lazy Fetch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** configure() 시 eager fetch/listener를 제거하고, items()/get() 첫 접근 시 lazy하게 초기화하도록 복원

**Architecture:** configure()에서 signal, memo, client 참조, accessor 객체만 생성. key별 `initialized` 플래그 + `ensureInitialized()` 함수로 items()/get() 첫 호출 시 listener 등록 + fetch 수행

**Tech Stack:** SolidJS, Vitest, @simplysm/solid

---

### Task 1: Lazy fetch 검증 테스트 작성

**Files:**
- Modify: `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`

**Step 1: Write the failing test**

테스트 파일 맨 끝, `describe("SharedDataProvider", () => { ... })` 블록의 마지막 `it(...)` 뒤에 추가:

```typescript
  it("configure() 직후에는 fetch하지 않고, items() 접근 시 lazy하게 fetch한다", async () => {
    const { serviceClientValue, mockClient } = createMockServiceClient();
    const mockUsers: TestUser[] = [{ id: 1, name: "Alice" }];

    const fetchFn = vi.fn(() => Promise.resolve(mockUsers));

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: fetchFn,
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    // configure만 호출하고 items()에 접근하지 않는 컴포넌트
    function ConfigureOnly() {
      const shared = useTestSharedData();
      shared.configure(() => definitions);
      return <div data-testid="configured">configured</div>;
    }

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureOnly />
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    // configure 직후: fetch와 addEventListener가 호출되지 않아야 함
    await vi.waitFor(() => {
      expect(result.getByTestId("configured").textContent).toBe("configured");
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(mockClient.addEventListener).not.toHaveBeenCalled();

    result.unmount();
  });
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx --run --project=solid`
Expected: FAIL — `fetchFn`이 호출되었으므로 `expect(fetchFn).not.toHaveBeenCalled()` 실패

**Step 3: Commit failing test**

```bash
git add packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx
git commit -m "test(solid): add failing test for SharedData lazy fetch"
```

---

### Task 2: SharedDataProvider lazy fetch 구현

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:130-178`

**Step 1: configure() 내 for loop 변경**

현재 코드 (130-178행)의 for loop를 다음으로 교체:

```typescript
    for (const [name, def] of Object.entries(definitions)) {
      const [items, setItems] = createSignal<unknown[]>([]);
      // eslint-disable-next-line solid/reactivity -- signal 참조를 Map에 저장하는 것은 반응성 접근이 아님
      signalMap.set(name, [items, setItems]);

      const itemMap = createMemo(() => {
        const map = new Map<string | number, unknown>();
        for (const item of items()) {
          map.set(def.getKey(item as never), item);
        }
        return map;
      });
      // eslint-disable-next-line solid/reactivity -- memo 참조를 Map에 저장하는 것은 반응성 접근이 아님
      memoMap.set(name, itemMap);

      const client = serviceClient.get(def.serviceKey ?? "default");

      let initialized = false;

      function ensureInitialized() {
        if (initialized) return;
        initialized = true;

        // TODO: addEventListener가 resolve 전에 unmount되면 listener orphan 가능
        void client
          .addEventListener(
            SharedDataChangeEvent,
            { name, filter: def.filter },
            async (changeKeys) => {
              await loadData(name, def, changeKeys);
            },
          )
          .then((key) => {
            listenerKeyMap.set(name, key);
          });

        void loadData(name, def);
      }

      accessors[name] = {
        items: () => {
          ensureInitialized();
          return items();
        },
        get: (key: string | number | undefined) => {
          ensureInitialized();
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
        getKey: def.getKey,
        getSearchText: def.getSearchText,
        getIsHidden: def.getIsHidden,
        getParentKey: def.getParentKey,
      };
    }
```

**Step 2: JSDoc 업데이트**

`SharedDataProvider.tsx` 21행의 JSDoc remarks 변경:

```
 * - configure() 호출 후: definitions의 각 key마다 서버 이벤트 리스너를 등록하여 실시간 동기화
```
→
```
 * - configure() 호출 후: definitions 등록. 각 key의 items()/get() 첫 접근 시 서버 이벤트 리스너 등록 + fetch (lazy)
```

**Step 3: Run all tests to verify**

Run: `pnpm vitest packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx --run --project=solid`
Expected: ALL PASS (7개 — 기존 6개 + 새 lazy test 1개)

**Step 4: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx
git commit -m "refactor(solid): restore lazy fetching in SharedDataProvider

configure() no longer eagerly fetches data or registers event listeners.
Instead, each key's listener + fetch is triggered lazily on first
items()/get() access, matching v12 SdSharedDataProvider behavior."
```
