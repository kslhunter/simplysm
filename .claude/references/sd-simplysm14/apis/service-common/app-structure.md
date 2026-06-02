# @simplysm/service-common — app-structure

앱의 메뉴·권한 트리 정의 타입과, 사용자의 활성 모듈(`usableModules`) 기준으로 권한을 평탄화/필터링하는 유틸. 트리 노드는 `modules`(OR)·`requiredModules`(AND) 로 가시성을 제어한다. `TModule` 제네릭은 모듈 식별자 타입(앱별 enum/string).

## 트리 타입

`AppStructureItem<TModule>` = `AppStructureGroupItem<TModule>` | `AppStructureLeafItem<TModule>`. 메뉴 트리의 노드(`children` 유무로 그룹/리프 판별).

`AppStructureGroupItem<TModule>` — 하위 노드를 갖는 그룹 노드.
- `code: string` — 노드 식별 코드. 권한 codeChain 에 누적됨.
- `title: string` — 표시 제목. titleChain 에 누적됨.
- `modules?: TModule[]` — 이 중 하나라도 활성이면 통과(OR). 빈 배열/`undefined` 면 제약 없음.
- `requiredModules?: TModule[]` — 전부 활성이어야 통과(AND).
- `icon?: string` — 메뉴 아이콘.
- `children: AppStructureItem<TModule>[]` — 하위 노드 배열(필수, 그룹 판별 키).

`AppStructureLeafItem<TModule>` — 실제 화면 노드.
- `code: string` / `title: string` / `modules?` / `requiredModules?` / `icon?` — 그룹과 동일 의미.
- `perms?: ("use" | "edit")[]` — 이 화면 직접 권한. `"use"`=조회 권한 / `"edit"`=편집 권한. 각 항목이 평탄 권한 1건이 됨.
- `subPerms?: AppStructureSubPermission<TModule>[]` — 화면 내 세부 권한 묶음.
- `url?: string` — 라우팅 경로.
- `isNotMenu?: boolean` — true 면 메뉴에 노출 안 함(권한만 존재하는 화면), false/미지정이면 메뉴 노출.

`AppStructureSubPermission<TModule>` — 화면 하위 세부 권한 묶음.
- `code: string` / `title: string` / `modules?` / `requiredModules?` — 동일 의미. subPerm 자체의 modules/requiredModules 도 별도 검사됨.
- `perms: ("use" | "edit")[]` — 이 세부 묶음의 권한 종류(필수). `"use"`=조회 / `"edit"`=편집.

`FlatPermission<TModule>` — 평탄화 결과 1건.
- `titleChain: string[]` — 루트→해당 권한까지 제목 경로.
- `codeChain: string[]` — code + perm/subPerm 코드 누적 경로(권한 식별자).
- `modulesChain: TModule[][]` — 경로상 각 레벨 modules 누적.

## 유틸 함수

- `isUsableModules(modules, requiredModules, usableModules): boolean` — 단일 노드 가시성 판정. `requiredModules` 전부 포함(AND) **그리고** `modules` 중 하나 포함(또는 빈 배열/`undefined` 면 통과, OR). 둘 중 하나만 검사하려면 나머지 인자에 `undefined` 전달.
- `isUsableModulesChain(modulesChain, requiredModulesChain, usableModules): boolean` — 루트부터 누적된 체인 전체 통과 여부. 각 레벨 modules 는 OR, 각 레벨 requiredModules 는 AND 로 모두 만족해야 true.
- `getFlatPermissions(items, usableModules): FlatPermission<TModule>[]` — 트리를 BFS 순회하며 `usableModules` 로 필터된 모든 권한을 평탄 목록으로 산출. 모듈 체인을 통과한 노드의 `perms`·`subPerms.perms` 각각을 `FlatPermission` 1건으로 변환. subPerm 은 자체 modules/requiredModules 도 추가 검사.

```ts
const flats = getFlatPermissions(appStructure, currentUser.usableModules);
const codes = flats.map((f) => f.codeChain.join(".")); // 예: "order.list.edit"
if (isUsableModules(item.modules, item.requiredModules, usableModules)) showMenu(item);
```

주의:
- `usableModules` 가 `undefined` 이면 modules/requiredModules 가 지정된 노드는 통과 못 함(`includes` 가 false).
- `modules` 가 비었거나 `undefined` 인 노드는 모듈 제약 없이 항상 통과(OR 기본).
- `codeChain` 마지막 요소는 perm(`"use"`/`"edit"`), 또는 subPerm.code 뒤의 perm 으로 끝남.
