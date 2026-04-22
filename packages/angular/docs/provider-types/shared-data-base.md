# `SharedDataBase`

공유 데이터 기본 인터페이스. 모든 공유 데이터 항목이 구현해야 한다.

```typescript
interface SharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `__valueKey` | `TKey` | 고유 키 |
| `__searchText` | `string` | 검색 대상 텍스트 |
| `__isHidden` | `boolean` | 숨김 여부 |
| `__parentKey` | `TKey \| undefined` | 부모 키 (트리 구조용) |

## Related Types

### `SharedDataInfo`

공유 데이터 등록 정보.

```typescript
interface SharedDataInfo<T extends SharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (a: T, b: T) => number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `serviceKey` | `string` | ServiceClient 연결 키 |
| `getter` | `(changeKeys?) => Promise<T[]>` | 데이터 조회 함수. changeKeys 전달 시 부분 조회 |
| `filter` | `unknown` | 이벤트 필터 (같은 이름의 다른 필터 구분용) |
| `orderBy` | `((a, b) => number) \| undefined` | 정렬 함수 |

### `SharedDataHandle`

공유 데이터 핸들. `SdSharedDataProvider.getHandle()`이 반환하는 객체.

```typescript
interface SharedDataHandle<T extends SharedDataBase<string | number>> {
  items: Signal<T[]>;
  get(key: T["__valueKey"] | undefined): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `Signal<T[]>` | 데이터 항목 signal |
| `get(key)` | `(key) => T \| undefined` | 키로 항목 조회 |
