# SharedDataProvider lazy fetching 복원

## 문제

v12에서 v13 마이그레이션 시 lazy fetching 동작이 eager pre-fetching으로 변경됨.

- v12: `register()` → 정의만 저장 / `getSignal()` 첫 호출 시 listener 등록 + fetch
- v13 (현재): `configure()` 호출 시 모든 definition에 대해 즉시 listener 등록 + fetch

## 해결

`configure()`에서 signal, memo, accessor 객체는 생성하되 listener 등록과 fetch는 하지 않는다.
key별 `initialized` 플래그를 두고, `items()` 또는 `get()` 첫 호출 시 lazy 초기화한다.

## 변경 파일

- `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`
- `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx` (lazy 동작 검증 테스트 추가)

## 상세 설계

### configure() 내부 변경

```typescript
for (const [name, def] of Object.entries(definitions)) {
  const [items, setItems] = createSignal<unknown[]>([]);
  signalMap.set(name, [items, setItems]);

  const itemMap = createMemo(() => { ... });
  memoMap.set(name, itemMap);

  // client 참조는 eager (emit에서도 사용, 네트워크 호출 아님)
  const client = serviceClient.get(def.serviceKey ?? "default");

  // lazy 초기화 플래그
  let initialized = false;

  function ensureInitialized() {
    if (initialized) return;
    initialized = true;

    // TODO: addEventListener가 resolve 전에 unmount되면 listener orphan 가능
    // listener 등록 (lazy)
    void client.addEventListener(
      SharedDataChangeEvent,
      { name, filter: def.filter },
      async (changeKeys) => { await loadData(name, def, changeKeys); },
    ).then((key) => { listenerKeyMap.set(name, key); });

    // 초기 fetch (lazy)
    void loadData(name, def);
  }

  accessors[name] = {
    items: () => { ensureInitialized(); return items(); },
    get: (key) => {
      ensureInitialized();
      if (key === undefined) return undefined;
      return itemMap().get(key);
    },
    emit: async (changeKeys) => {
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

### 제거 항목

- configure() 내 즉시 listener 등록 (146~156행) → `ensureInitialized()`로 이동
- configure() 내 `void loadData(name, def)` (158행) → `ensureInitialized()`로 이동

### emit()은 초기화와 무관

- `client` 참조는 configure()에서 eager 생성 (동기 getter, 네트워크 호출 아님)
- v12에서도 `emitAsync()`는 signal 존재 여부와 무관하게 동작

### 기존 테스트 영향

기존 테스트는 `items()` 접근 시 자동으로 fetch가 트리거되므로 동작 변화 없이 통과.
