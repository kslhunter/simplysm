# `SdLocalStorageProvider`

`clientName` 스코프 localStorage 래퍼. 키가 `{clientName}.{key}` 형태로 저장된다.

```typescript
@Injectable({ providedIn: "root" })
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `set(key, value)` | method | `(K, T[K]) => void` | 값 저장 |
| `get(key)` | method | `(K) => T[K] \| undefined` | 값 조회 |
| `remove(key)` | method | `(keyof T & string) => void` | 값 삭제 |
