# isUsableModulesChain

모듈 체인 전체의 접근 가능 여부를 판단한다. 트리의 각 레벨에서 모듈 조건을 모두 만족해야 한다.

```typescript
export function isUsableModulesChain<TModule>(
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
  usableModules: TModule[] | undefined,
): boolean;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `modulesChain` | `TModule[][]` | 각 레벨의 OR 조건 모듈 배열 |
| `requiredModulesChain` | `TModule[][]` | 각 레벨의 AND 조건 모듈 배열 |
| `usableModules` | `TModule[] \| undefined` | 사용자가 보유한 활성 모듈 목록 |

## Returns

`boolean` — 모든 레벨의 조건을 만족하면 `true`. 하나라도 실패하면 `false`.
