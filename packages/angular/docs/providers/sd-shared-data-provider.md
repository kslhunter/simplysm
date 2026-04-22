# `SdSharedDataProvider`

이벤트 기반 공유 데이터 캐시 추상 프로바이더. `@Injectable()`로 제공되며, 소비 프로젝트에서 상속한다.

```typescript
@Injectable()
abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string | number>>> {
  readonly loadingCount: WritableSignal<number>;

  abstract initialize(): void;
  register<K extends string & keyof T>(name: K, info: SharedDataInfo<T[K]>): void;
  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]>;
  async emitAsync<K extends string & keyof T>(name: K, changeKeys?: (string | number)[]): Promise<void>;
  async wait(): Promise<void>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `loadingCount` | property | `WritableSignal<number>` | 현재 로딩 중인 데이터 타입 수 |
| `initialize()` | method | abstract | 공유 데이터 등록 진입점 |
| `register(name, info)` | method | `(K, SharedDataInfo<T[K]>) => void` | 공유 데이터 등록 (getter, serviceKey, filter, orderBy) |
| `getHandle(name)` | method | `(K) => SharedDataHandle<T[K]>` | 등록된 공유 데이터 핸들 반환 (items signal + get 메서드) |
| `emitAsync(name, changeKeys?)` | method | `(K, (string\|number)[]?) => Promise<void>` | 변경 이벤트 발행 |
| `wait()` | method | `() => Promise<void>` | 모든 로딩 완료까지 대기 |

## 로딩 전략 (Lazy Loading)

`register()`는 메타정보만 등록하고 실제 데이터를 가져오지 않는다. 타입별 데이터는 해당 타입의 `getHandle(name)`이 **처음 호출되는 시점**에 `info.getter()`를 실행하여 로딩된다.

- 첫 `getHandle()` 호출 → `getter()` 실행 + `SdSharedDataChange` 리스너 등록
- 이후 같은 타입의 `getHandle()` 호출은 캐시된 `itemsSignal`을 재사용
- 갱신은 서버에서 `emitAsync()`로 발행된 `SdSharedDataChange` 이벤트 수신 시에만 발생

## 소비 화면에서의 사용 규칙

### 변경 전파 의무

화면에서 `SdSharedDataProvider`에 등록된 데이터를 변경(INSERT/UPDATE/DELETE)하는 경우, 저장 로직 완료 후 **반드시** `emitAsync(name, changedKeys)`를 호출하여 변경을 전파한다.

- `name`: 변경된 공유 데이터의 등록 이름 (예: `"고객"`)
- `changedKeys`: 변경된 레코드의 키 배열 (부분 갱신 최적화용). 전체 갱신은 생략 가능

호출하지 않으면 다른 화면의 공유 데이터 캐시가 갱신되지 않는다.

```typescript
// 저장 후 변경 전파 패턴
await this._sdSharedData.emitAsync("고객", changedIds);
```

## Related Types

### `SdSharedDataChangeEvent`

공유 데이터 변경 이벤트 정의.

```typescript
const SdSharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SdSharedDataChange");
```
