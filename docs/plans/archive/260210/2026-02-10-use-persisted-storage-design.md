# usePersisted 저장방식 확장 설계

> 작성일: 2026-02-10
> 마이그레이션 항목 #13: ConfigProvider에 storage 전략 주입, 없으면 localStorage 폴백

## 배경

현재 `usePersisted`는 `localStorage`에 하드코딩되어 있다. 서버 저장소, IndexedDB 등 다른 저장 방식을 지원하려면 storage 전략을 외부에서 주입할 수 있어야 한다.

## 설계 결정

| 항목              | 결정                             |
| ----------------- | -------------------------------- |
| 비동기 지원       | O (서버, IndexedDB 등)           |
| loading 상태 노출 | O (세 번째 반환값)               |
| 주입 위치         | ConfigContext 확장               |
| 오버라이드 범위   | 전역만 (ConfigContext 단일 설정) |

## StorageAdapter 인터페이스

```typescript
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

`localStorage`, `sessionStorage`는 이 인터페이스와 호환되므로 그대로 전달 가능하다.

## AppConfig 확장

```typescript
export interface AppConfig {
  clientName: string;
  storage?: StorageAdapter; // 없으면 localStorage 폴백
}
```

## usePersisted 변경

```typescript
export function usePersisted<T>(key: string, initialValue: T): [Accessor<T>, Setter<T>, Accessor<boolean>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;
  const storage = config.storage ?? localStorage;

  const [value, setValue, init] = makePersisted(createSignal<T>(initialValue), {
    name: prefixedKey,
    storage,
    serialize: (v) => jsonStringify(v),
    deserialize: (v) => jsonParse<T>(v),
  });

  // loading 상태: 동기 storage면 항상 false, 비동기면 init 완료까지 true
  const isAsync = storage !== localStorage && storage !== sessionStorage;
  const [loading, setLoading] = createSignal(isAsync);

  if (isAsync && init) {
    void Promise.resolve(init).then(() => setLoading(false));
  }

  return [value, setValue, loading];
}
```

`makePersisted`는 비동기 storage일 때 세 번째 요소로 `init` (Promise-like)을 반환한다. 이를 resolve하여 loading 상태를 추적한다.

## 하위 호환성

- 반환 타입: `[value, setValue]` → `[value, setValue, loading]`
- 기존 사용처에서 `[value, setValue]`로 구조 분해하면 `loading`은 무시됨 → **하위 호환 유지**
- `InitializeProvider`에 `storage`를 전달하지 않으면 기존과 동일하게 `localStorage` 사용

## 변경 파일

| 파일                                           | 변경                                                           |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `packages/solid/src/contexts/ConfigContext.ts` | `StorageAdapter` 인터페이스 정의, `AppConfig.storage` 추가     |
| `packages/solid/src/contexts/usePersisted.ts`  | storage를 ConfigContext에서 읽기, loading 추가, 반환 타입 확장 |
| `packages/solid/src/index.ts`                  | `StorageAdapter` 타입 export                                   |

## 변경 불필요 파일

- `InitializeProvider.tsx` — config 타입만 바뀌고 구현은 동일
- `StatePreset.tsx` — `[presets, setPresets]` 구조 분해 유지
- `SidebarContainer.tsx` — `[toggle, setToggle]` 구조 분해 유지
- `Sheet.tsx` — `[config, setConfig]` 구조 분해 유지
