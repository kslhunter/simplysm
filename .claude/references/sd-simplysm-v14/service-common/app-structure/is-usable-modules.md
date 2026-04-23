# isUsableModules

단일 항목의 모듈 접근 가능 여부를 판단한다.

```typescript
export function isUsableModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `modules` | `TModule[] \| undefined` | OR 조건 모듈 목록. 하나라도 `usableModules`에 포함되면 통과 |
| `requiredModules` | `TModule[] \| undefined` | AND 조건 모듈 목록. 모두 `usableModules`에 포함되어야 통과 |
| `usableModules` | `TModule[] \| undefined` | 사용자가 보유한 활성 모듈 목록 |

## Returns

`boolean` — `modules`와 `requiredModules` 조건을 모두 만족하면 `true`.

- `modules`가 `undefined`이거나 빈 배열이면 OR 조건은 자동 통과
- `requiredModules`가 `undefined`이거나 빈 배열이면 AND 조건은 자동 통과
- `usableModules`가 `undefined`이면 `modules`가 있을 때 `false`

## Usage

```typescript
import { isUsableModules } from "@simplysm/service-common";

// OR 조건: moduleA 또는 moduleB 중 하나라도 있으면 true
isUsableModules(["moduleA", "moduleB"], undefined, ["moduleA"]); // true

// AND 조건: 모두 있어야 true
isUsableModules(undefined, ["moduleA", "moduleB"], ["moduleA"]); // false

// 모듈 없음: 자동 통과
isUsableModules(undefined, undefined, undefined); // true
```
