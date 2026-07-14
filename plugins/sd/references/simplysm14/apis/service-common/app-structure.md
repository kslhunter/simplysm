# @simplysm/service-common — AppStructure

앱 메뉴/권한/모듈 구조 항목 타입과, 항목 배열에서 모듈 조건을 판정하고 권한 코드를 평탄화하는 standalone 유틸 묶음임. 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)

## 구조 타입

### AppStructureItem

```ts
type AppStructureItem<TModule = unknown> =
  AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;
```

- `TModule = unknown` — `modules`/`requiredModules` 에 쓰는 모듈 식별자 타입.
- 그룹 항목(`children` 보유)과 leaf 항목(`perms`/`subPerms` 보유 가능)의 유니언. `getFlatPermissions` 는 `"children" in item` 으로 그룹을, `"perms"`/`"subPerms" in item` 으로 leaf 권한을 구분함.

### AppStructureGroupItem

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

- `code: string` — 항목 코드. `getFlatPermissions` 가 부모 체인 뒤에 붙여 `codeChain` 을 만듦.
- `title: string` — 항목 제목. `getFlatPermissions` 가 부모 체인 뒤에 붙여 `titleChain` 을 만듦.
- `modules?: TModule[]` — 모듈 OR 조건. 없거나 빈 배열이면 통과, 값이 있으면 `usableModules` 에 하나 이상 포함되어야 통과.
- `requiredModules?: TModule[]` — 모듈 AND 조건. 값이 있고 비어있지 않으면 모든 값이 `usableModules` 에 포함되어야 통과.
- `icon?: string` — 아이콘 식별 문자열. 이 패키지 유틸에서는 읽지 않음.
- `children: AppStructureItem<TModule>[]` — 하위 항목 배열. `getFlatPermissions` 는 현재 항목이 모듈 조건을 통과한 뒤 각 자식을 큐에 넣음.

### AppStructureLeafItem

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

- `code: string` — 항목 코드. `codeChain` 구성에 쓰인다.
- `title: string` — 항목 제목. `titleChain` 구성에 쓰인다.
- `modules?: TModule[]` — 모듈 OR 조건(위 그룹과 동일 규칙).
- `requiredModules?: TModule[]` — 모듈 AND 조건(위 그룹과 동일 규칙).
- `perms?: ("use" | "edit")[]` — 직접 권한 코드 배열. `"use"` 는 사용 권한, `"edit"` 는 편집 권한을 뜻하며 값이 그대로 `codeChain` 끝에 붙음(유틸 내부에 값별 분기는 없음).
- `subPerms?: AppStructureSubPermission<TModule>[]` — 하위 권한 배열. 각 항목의 모듈 조건을 통과하면 `subPerm.code` 와 `perm` 이 `codeChain` 뒤에 붙음.
- `icon?: string` — 아이콘 식별 문자열. 이 패키지 유틸에서는 읽지 않음.
- `url?: string` — 메뉴 이동 URL. 이 패키지 유틸에서는 읽지 않음.
- `isNotMenu?: boolean` — `true` 면 메뉴에 표시하지 않는 항목, 생략/`false` 면 메뉴 항목임을 뜻하는 플래그. 이 패키지 유틸에서는 읽지 않음.

### AppStructureSubPermission

```ts
interface AppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

- `code: string` — 하위 권한 코드. leaf `codeChain` 뒤, `perm` 앞에 붙음.
- `title: string` — 하위 권한 제목. 이 패키지 유틸에서는 읽지 않음.
- `modules?: TModule[]` — 하위 권한 모듈 OR 조건(동일 규칙).
- `requiredModules?: TModule[]` — 하위 권한 모듈 AND 조건(동일 규칙).
- `perms: ("use" | "edit")[]` — 하위 권한의 필수 권한 코드 배열. `"use"`/`"edit"` 가 값 그대로 `codeChain` 끝에 붙음.

### FlatPermission

```ts
interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

- `TModule = unknown` — `modulesChain` 의 모듈 식별자 타입.
- `titleChain: string[]` — root 부터 해당 권한 항목까지의 `title` 누적 배열(권한 리터럴은 포함하지 않음).
- `codeChain: string[]` — root 부터의 `code` 누적에 권한 리터럴(또는 `subPerm.code` + 권한 리터럴)을 덧붙인 배열. 권한 식별 키로 쓰임.
- `modulesChain: TModule[][]` — 경로상 존재하는 `modules` 배열들의 누적. sub permission 결과에는 `subPerm.modules ?? []` 가 추가로 뒤에 붙음.

## 유틸 함수

### isUsableModules

```ts
function isUsableModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean;
```

- `modules` — OR 조건 모듈 배열. `undefined`/빈 배열이면 이 조건은 통과, 값이 있으면 하나 이상이 `usableModules` 에 포함되어야 통과.
- `requiredModules` — AND 조건 모듈 배열. 값이 있고 비어있지 않으면 모든 값이 `usableModules` 에 포함되어야 통과.
- `usableModules` — 활성 모듈 배열. `undefined` 이면 비어있지 않은 `modules`/`requiredModules` 조건은 통과하지 못함.
- 반환 — `requiredModules`(AND)를 먼저 검사하고 실패 시 바로 `false`, 통과하면 `modules`(OR)를 검사한 결과.

### isUsableModulesChain

```ts
function isUsableModulesChain<TModule>(
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
  usableModules: TModule[] | undefined,
): boolean;
```

- `modulesChain` — 경로상 OR 조건 배열들의 목록. 각 배열이 `isUsableModules(modules, undefined, usableModules)` 를 통과해야 함.
- `requiredModulesChain` — 경로상 AND 조건 배열들의 목록. 각 배열이 `isUsableModules(undefined, requiredModules, usableModules)` 를 통과해야 함.
- `usableModules` — 활성 모듈 배열.
- 반환 — 모든 OR 배열과 모든 AND 배열을 통과하면 `true`, 하나라도 실패하면 `false`. 빈 체인이면 `true`.

### getFlatPermissions

```ts
function getFlatPermissions<TModule>(
  items: AppStructureItem<TModule>[],
  usableModules: TModule[] | undefined,
): FlatPermission<TModule>[];
```

- `items` — 순회할 root 항목 배열. 내부에서 BFS 큐로 항목과 자식을 순회함.
- `usableModules` — 각 항목과 sub permission 의 `modules`/`requiredModules` 조건 판정에 쓰는 활성 모듈 배열.
- 반환 — 모듈 조건을 통과한 항목의 직접 `perms` 와 `subPerms.perms` 를 평탄화한 `FlatPermission` 배열.
- 동작 — 항목마다 `title`/`code`/`modules`(존재 시만)/`requiredModules`(존재 시만)를 부모 체인에 누적하고, `isUsableModulesChain` 으로 경로 누적 조건을 검사해 실패하면 그 항목과 자식을 건너뜀. 통과 시 `children` 을 큐에 넣고, `perms` 가 있으면 각 `perm` 마다 결과 한 건씩(`codeChain` = 현재 코드 체인 + `perm`)을 만듦. `subPerms` 는 `subPerm` 자체의 모듈 조건을 추가 통과한 경우에만 각 `perm` 마다 결과를 만들며 `codeChain` = 현재 코드 체인 + `subPerm.code` + `perm`, `modulesChain` 끝에 `subPerm.modules ?? []` 를 더함.
