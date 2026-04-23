# Set Extensions

`@simplysm/core-common`을 import하면 `Set.prototype`에 확장 메서드가 자동 등록된다.

side-effect import로 활성화:

```typescript
import "@simplysm/core-common";
```

## Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `adds` | `(...values: T[]) => this` | 여러 값을 한 번에 추가 |
| `toggle` | `(value: T, addOrDel?: "add" \| "del") => this` | 값 토글 (있으면 제거, 없으면 추가). `addOrDel`로 강제 추가/제거 가능 |

## Usage

```typescript
import "@simplysm/core-common";

const set = new Set<number>([1, 2, 3]);

// adds — 여러 항목 추가
set.adds(4, 5, 6); // {1, 2, 3, 4, 5, 6}

// toggle — 자동
set.toggle(2);  // 2가 있으므로 제거 → {1, 3, 4, 5, 6}
set.toggle(10); // 10이 없으므로 추가 → {1, 3, 4, 5, 6, 10}

// toggle — 강제
const isAdmin = true;
set.toggle(5, isAdmin ? "add" : "del"); // 강제 추가
```
