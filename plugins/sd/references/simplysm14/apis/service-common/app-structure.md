# @simplysm/service-common — AppStructure

앱 구조 항목 타입과, 항목 배열에서 모듈 조건을 판정하고 권한 코드를 평탄화하는 유틸 묶음이다. 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)

## AppStructureItem

```ts
type AppStructureItem<TModule = unknown> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>
```

- `TModule = unknown` — `modules`/`requiredModules`/`modulesChain` 에 쓰이는 모듈 식별자 타입.
- `AppStructureGroupItem<TModule>` — `children` 필드가 있는 그룹 항목 타입. `getFlatPermissions` 는 `"children" in item` 분기로 자식을 큐에 넣는다.
- `AppStructureLeafItem<TModule>` — `perms`/`subPerms` 를 가질 수 있는 leaf 항목 타입. `getFlatPermissions` 는 `perms` 와 `subPerms` 가 있을 때 권한 결과를 만든다.

## AppStructureGroupItem

```ts
interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  icon?: string;
  children: AppStructureItem<TModule>[];
}
```

- `code: string` — `getFlatPermissions` 가 부모 체인 뒤에 붙여 `codeChain` 을 만드는 항목 코드.
- `title: string` — `getFlatPermissions` 가 부모 체인 뒤에 붙여 `titleChain` 을 만드는 항목 제목.
- `modules?: TModule[]` — 모듈 OR 조건. 값이 없거나 빈 배열이면 통과, 값이 있으면 `usableModules` 에 하나 이상 포함되어야 통과한다.
- `requiredModules?: TModule[]` — 모듈 AND 조건. 값이 있고 빈 배열이 아니면 모든 값이 `usableModules` 에 포함되어야 통과한다.
- `icon?: string` — 문자열 필드. 이 패키지 유틸에서는 읽지 않는다.
- `children: AppStructureItem<TModule>[]` — 하위 항목 배열. `getFlatPermissions` 는 현재 항목의 모듈 조건을 통과한 뒤 각 자식을 큐에 넣는다.

## AppStructureLeafItem

```ts
interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPermission<TModule>[];
  icon?: string;
  url?: string;
  isNotMenu?: boolean;
}
```

- `code: string` — `getFlatPermissions` 가 부모 체인 뒤에 붙여 `codeChain` 을 만드는 항목 코드.
- `title: string` — `getFlatPermissions` 가 부모 체인 뒤에 붙여 `titleChain` 을 만드는 항목 제목.
- `modules?: TModule[]` — 모듈 OR 조건. 값이 없거나 빈 배열이면 통과, 값이 있으면 `usableModules` 에 하나 이상 포함되어야 통과한다.
- `requiredModules?: TModule[]` — 모듈 AND 조건. 값이 있고 빈 배열이 아니면 모든 값이 `usableModules` 에 포함되어야 통과한다.
- `perms?: ("use" | "edit")[]` — 직접 권한 코드 배열. `"use"` 와 `"edit"` 는 값 그대로 `codeChain` 끝에 붙으며 이 패키지 유틸 안의 값별 분기는 없다.
- `subPerms?: AppStructureSubPermission<TModule>[]` — 하위 권한 배열. 각 항목의 모듈 조건을 통과하면 `subPerm.code` 와 `perm` 이 `codeChain` 뒤에 붙는다.
- `icon?: string` — 문자열 필드. 이 패키지 유틸에서는 읽지 않는다.
- `url?: string` — 문자열 필드. 이 패키지 유틸에서는 읽지 않는다.
- `isNotMenu?: boolean` — boolean 필드. 이 패키지 유틸에서는 읽지 않는다.

## AppStructureSubPermission

```ts
interface AppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

- `code: string` — `getFlatPermissions` 가 leaf `codeChain` 뒤에 붙이는 하위 권한 코드.
- `title: string` — 문자열 제목 필드. 이 패키지 유틸에서는 읽지 않는다.
- `modules?: TModule[]` — 하위 권한의 모듈 OR 조건. 값이 없거나 빈 배열이면 통과, 값이 있으면 `usableModules` 에 하나 이상 포함되어야 통과한다.
- `requiredModules?: TModule[]` — 하위 권한의 모듈 AND 조건. 값이 있고 빈 배열이 아니면 모든 값이 `usableModules` 에 포함되어야 통과한다.
- `perms: ("use" | "edit")[]` — 하위 권한의 필수 권한 코드 배열. `"use"` 와 `"edit"` 는 값 그대로 `codeChain` 끝에 붙으며 이 패키지 유틸 안의 값별 분기는 없다.

## FlatPermission

```ts
interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

- `TModule = unknown` — `modulesChain` 의 모듈 식별자 타입.
- `titleChain: string[]` — `getFlatPermissions` 가 root 부터 현재 leaf 까지의 `title` 을 누적한 배열.
- `codeChain: string[]` — `getFlatPermissions` 가 root 부터 현재 leaf 까지의 `code` 에 권한 리터럴 또는 `subPerm.code`/권한 리터럴을 덧붙인 배열.
- `modulesChain: TModule[][]` — `getFlatPermissions` 가 경로상 존재하는 `modules` 배열을 누적한 배열. sub permission 결과에는 `subPerm.modules ?? []` 도 뒤에 붙는다.

## isUsableModules

```ts
function isUsableModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean
```

- `modules: TModule[] | undefined` — OR 조건 모듈 배열. `undefined` 또는 빈 배열이면 이 조건은 통과하고, 값이 있으면 하나 이상이 `usableModules` 에 포함되어야 통과한다.
- `requiredModules: TModule[] | undefined` — AND 조건 모듈 배열. 값이 있고 빈 배열이 아니면 모든 값이 `usableModules` 에 포함되어야 통과한다.
- `usableModules: TModule[] | undefined` — 활성 모듈 배열. 값이 `undefined` 이면 비어 있지 않은 `modules`/`requiredModules` 조건은 통과하지 못한다.
- 반환 `boolean` — `requiredModules` 조건을 먼저 검사하고, 그다음 `modules` 조건을 검사한 결과.

## isUsableModulesChain

```ts
function isUsableModulesChain<TModule>(
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
  usableModules: TModule[] | undefined,
): boolean
```

- `modulesChain: TModule[][]` — 경로상 OR 조건 배열들의 목록. 각 배열이 `isUsableModules(modules, undefined, usableModules)` 를 통과해야 한다.
- `requiredModulesChain: TModule[][]` — 경로상 AND 조건 배열들의 목록. 각 배열이 `isUsableModules(undefined, requiredModules, usableModules)` 를 통과해야 한다.
- `usableModules: TModule[] | undefined` — 활성 모듈 배열.
- 반환 `boolean` — 모든 OR 조건 배열과 모든 AND 조건 배열을 통과하면 `true`, 하나라도 실패하면 `false`.

## getFlatPermissions

```ts
function getFlatPermissions<TModule>(
  items: AppStructureItem<TModule>[],
  usableModules: TModule[] | undefined,
): FlatPermission<TModule>[]
```

- `items: AppStructureItem<TModule>[]` — 순회할 root 항목 배열. 함수는 큐를 만들어 항목과 자식을 순회한다.
- `usableModules: TModule[] | undefined` — 항목과 sub permission 의 `modules`/`requiredModules` 조건 판정에 쓰는 활성 모듈 배열.
- 반환 `FlatPermission<TModule>[]` — 모듈 조건을 통과한 leaf 의 직접 `perms` 와 `subPerms.perms` 를 평탄화한 권한 목록.
- 직접 `perms` 결과 — `titleChain` 은 현재 항목까지, `codeChain` 은 현재 항목까지의 코드 뒤에 `perm` 을 붙이고, `modulesChain` 은 경로상 `modules` 배열 누적값을 쓴다.
- `subPerms` 결과 — `subPerm.modules`/`subPerm.requiredModules` 조건을 통과한 경우에만 생성하며, `codeChain` 은 현재 항목 코드 뒤에 `subPerm.code` 와 `perm` 을 붙인다.
