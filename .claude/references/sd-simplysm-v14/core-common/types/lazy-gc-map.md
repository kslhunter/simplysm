# LazyGcMap

자동 만료 기능이 있는 Map. LRU 방식으로 접근 시간을 갱신하고, 지정된 시간 동안 접근하지 않으면 자동 삭제한다. 사용 후 반드시 `dispose()`를 호출해야 GC 타이머가 정리된다.

```typescript
export class LazyGcMap<TKey, TValue> {
  constructor(options: {
    gcInterval?: number;
    expireTime: number;
    onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
  });
}
```

## Constructor Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expireTime` | `number` | 필수 | 만료 시간 (밀리초). 마지막 접근 이후 이 시간이 지나면 삭제됨 |
| `gcInterval` | `number` | 선택 | GC 간격 (밀리초). 생략 시 `expireTime / 10` (최소 1000ms) |
| `onExpire` | `(key: TKey, value: TValue) => void \| Promise<void>` | 선택 | 만료 시 호출되는 콜백. 에러 발생 시 로그 출력 후 계속 실행 |

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `size` | getter | `number` | 저장된 항목 수 |
| `has` | method | `(key: TKey) => boolean` | key 존재 여부 확인 (접근 시간 갱신하지 않음) |
| `get` | method | `(key: TKey) => TValue \| undefined` | 값 조회 (접근 시간 갱신) |
| `set` | method | `(key: TKey, value: TValue) => void` | 값 저장 (접근 시간 설정 및 GC 타이머 시작) |
| `delete` | method | `(key: TKey) => boolean` | 항목 삭제 |
| `getOrCreate` | method | `(key: TKey, factory: () => TValue) => TValue` | key가 없으면 팩토리로 생성하여 저장 후 반환 |
| `clear` | method | `() => void` | 모든 항목 삭제 (인스턴스는 계속 사용 가능) |
| `dispose` | method | `() => void` | 인스턴스 정리 (GC 타이머 중지 및 데이터 삭제). 이후 모든 작업 무시됨 |
| `values` | method | `() => IterableIterator<TValue>` | 값 순회 |
| `keys` | method | `() => IterableIterator<TKey>` | key 순회 |
| `entries` | method | `() => IterableIterator<[TKey, TValue]>` | 엔트리 순회 |

## Usage

```typescript
import { LazyGcMap } from "@simplysm/core-common";

const cache = new LazyGcMap<string, Data>({
  expireTime: 60_000,       // 60초 미접근 시 삭제
  gcInterval: 10_000,       // 10초마다 GC 실행 (생략 시 6000ms)
  onExpire: async (key, value) => {
    await value.cleanup();  // 정리 작업
  },
});

try {
  cache.set("key", data);
  const val = cache.get("key"); // 접근 시간 갱신
  const created = cache.getOrCreate("other", () => createData());
} finally {
  cache.dispose(); // 반드시 호출
}
```
