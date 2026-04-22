# Map Extensions

`@simplysm/core-common`을 import하면 `Map.prototype`에 확장 메서드가 자동 등록된다.

side-effect import로 활성화:

```typescript
import "@simplysm/core-common";
```

## Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrCreate` | `(key: K, newValue: V) => V` | key가 없으면 값을 설정하고 반환 |
| `getOrCreate` | `(key: K, newValueFn: () => V) => V` | key가 없으면 팩토리 함수를 호출하여 값을 설정하고 반환 |
| `update` | `(key: K, updateFn: (v: V \| undefined) => V) => void` | 현재 값을 받아 새 값으로 업데이트. key가 없으면 `undefined`가 전달됨 |

## Usage

```typescript
import "@simplysm/core-common";

// getOrCreate — 값으로
const map = new Map<string, number[]>();
const arr = map.getOrCreate("key", []);    // 없으면 [] 설정 후 반환

// getOrCreate — 팩토리로 (비용이 큰 연산에 사용)
const val = map.getOrCreate("key", () => expensiveComputation());

// 함수를 값으로 저장 시 팩토리로 감싸야 함
const fnMap = new Map<string, () => void>();
const myFn = () => console.log("hello");
fnMap.getOrCreate("key", () => myFn);  // 팩토리로 감싸기

// update — 카운터
const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1);

// update — 배열에 추가
const arrayMap = new Map<string, string[]>();
arrayMap.update("key", (v) => [...(v ?? []), "item"]);
```
