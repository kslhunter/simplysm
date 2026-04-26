# `SdSystemConfigProvider`

> **읽어야 하는 상황**: 비동기 설정을 저장하고 조회할 때.

비동기 설정 저장/조회 프로바이더. `fn` 필드를 설정하면 서버 저장, 미설정 시 localStorage에 저장.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemConfigProvider<T> {
  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K]): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<any>;
  };

  async setAsync<K extends keyof T & string>(key: K, data: T[K]): Promise<void>;
  async getAsync(key: keyof T & string): Promise<any>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `fn` | property | `{ set, get } \| undefined` | 서버 저장 함수. 미설정 시 localStorage 사용 |
| `setAsync(key, data)` | method | `(K, T[K]) => Promise<void>` | 설정 저장 |
| `getAsync(key)` | method | `(keyof T & string) => Promise<any>` | 설정 조회 |

## Related Types

### `injectSdSystemConfigResource`

컴포넌트 태그명 기반 키로 시스템 설정을 읽고 쓰는 resource 래퍼. 생성자에서 호출한다.

```typescript
function injectSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<ResourceStatus>;
  hasValue: () => boolean;
  reload: () => void;
  set(value: T | undefined): void;
  update(fn: (prev: T | undefined) => T | undefined): void;
}
```

`set()`/`update()` 호출 시 signal을 즉시 업데이트하고, 비동기로 `SdSystemConfigProvider.setAsync()`를 호출하여 영속화한다.
