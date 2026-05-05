# `getFlatPermissions`

> **읽어야 하는 상황**: 앱 구조 트리를 플래트닝하여 사용자별 권한 목록을 산출할 때. 트리 구조 정의는 [`AppStructureItem`](./app-structure-item.md) 참조.

## When to use

- 재귀 메뉴 트리에서 모듈 조건을 필터링하며 모든 권한을 플랫 배열로 추출할 때

앱 구조 트리를 BFS로 순회하며 모듈 조건을 필터링하여 [`FlatPermission`](./app-structure-item.md)`[]`으로 플래트닝한다.

```typescript
export function getFlatPermissions<TModule>(
  items: AppStructureItem<TModule>[],
  usableModules: TModule[] | undefined,
): FlatPermission<TModule>[];
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `items` | `AppStructureItem<TModule>[]` | 앱 구조 트리의 최상위 항목 배열 |
| `usableModules` | `TModule[] \| undefined` | 사용자가 보유한 활성 모듈 목록. `undefined`이면 모듈 조건이 없는 항목만 포함 |

## Returns

`FlatPermission<TModule>[]` — 모듈 조건을 만족하는 모든 권한의 플랫 목록.

처리 로직:
1. BFS로 트리를 순회하며 각 레벨의 `modules`(OR)와 `requiredModules`(AND) 조건을 체크
2. 조건 미충족 항목은 하위 트리 전체를 건너뜀
3. `AppStructureLeafItem`의 `perms`를 `codeChain`에 추가하여 `FlatPermission` 생성
4. `subPerms`도 개별 모듈 조건을 체크하여 `FlatPermission`으로 변환

## Usage

```typescript
import { getFlatPermissions } from "@simplysm/service-common";
import type { AppStructureItem } from "@simplysm/service-common";

const items: AppStructureItem<string>[] = [
  {
    code: "admin",
    title: "관리",
    children: [
      { code: "user", title: "사용자", perms: ["use", "edit"] },
    ],
  },
  {
    code: "report",
    title: "리포트",
    modules: ["moduleA"],
    perms: ["use"],
  },
];

const perms = getFlatPermissions(items, ["moduleA"]);
// [
//   { titleChain: ["관리", "사용자"], codeChain: ["admin", "user", "use"], modulesChain: [] },
//   { titleChain: ["관리", "사용자"], codeChain: ["admin", "user", "edit"], modulesChain: [] },
//   { titleChain: ["리포트"], codeChain: ["report", "use"], modulesChain: [["moduleA"]] },
// ]
```
