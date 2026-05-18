# @simplysm/service-common — app-structure

메뉴/권한 트리 정의 타입과 모듈(라이선스/플랜 등) 기반 가용성 평가·평탄화 함수.

## 타입

```ts
type AppStructureItem<TModule = unknown> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;

interface AppStructureGroupItem<TModule> {
  code: string; title: string;
  modules?: TModule[]; requiredModules?: TModule[];
  icon?: string;
  children: AppStructureItem<TModule>[];
}

interface AppStructureLeafItem<TModule> {
  code: string; title: string;
  modules?: TModule[]; requiredModules?: TModule[];
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPermission<TModule>[];
  icon?: string; url?: string;
  isNotMenu?: boolean;
}

interface AppStructureSubPermission<TModule> {
  code: string; title: string;
  modules?: TModule[]; requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}

interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];     // [...상위 code, perm] 또는 [...상위 code, subPerm.code, perm]
  modulesChain: TModule[][];
}
```

Group/Leaf 는 `children` 존재로 구분(`"children" in item`).

## isUsableModules(modules, requiredModules, usableModules) → boolean

- `requiredModules` (AND): 모두 `usableModules` 에 포함되어야 함. 없거나 빈 배열이면 통과.
- `modules` (OR): 비었거나 그 중 하나라도 `usableModules` 에 있으면 통과.

## isUsableModulesChain(modulesChain, requiredModulesChain, usableModules) → boolean

체인 각 레벨에 대해 `modules` OR 와 `requiredModules` AND 모두 만족해야 통과. 트리 깊이별 누적 조건 평가용.

## getFlatPermissions(items, usableModules) → FlatPermission[]

트리를 BFS 로 순회하며 각 leaf 의 `perms` / `subPerms` 를 평탄화한다.

- 진행 중 노드 단위로 `isUsableModulesChain` 체크 — 실패 시 하위 폐기.
- `subPerms` 도 자체 `modules`/`requiredModules` 로 추가 필터.
- 결과 `codeChain` 마지막에 권한값(`"use"|"edit"`)이 붙는다.

```ts
const perms = getFlatPermissions(items, ["BASIC", "PRO"]);
// [{ titleChain: ["주문","주문등록"], codeChain: ["order","register","use"], modulesChain: [["PRO"]] }, ...]
```
