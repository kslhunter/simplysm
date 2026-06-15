# @simplysm/service-common — app-structure

앱의 메뉴 트리·화면 권한·기능 모듈 on/off 를 한 배열(`AppStructureItem[]`)로 정의하는 타입과, 그 배열에서 평탄 권한 목록을 뽑거나 모듈 활성 여부를 판정하는 유틸. 메뉴를 정의할 때(타입)와 권한 페이지·메뉴 필터를 구성할 때(유틸) 같이 읽힌다. 공통 패키지에 클라이언트별 배열 상수를 두고 앱 부트스트랩에서 연결하는 패턴은 매뉴얼 `manuals/client-app-structure.md` 참조.

## AppStructureItem

```ts
type AppStructureItem<TModule = unknown> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>
```

메뉴 항목의 합집합 타입. `children` 을 가지면 그룹, 아니면 화면(leaf). `TModule` 은 기능 모듈 식별자 타입(보통 문자열 리터럴 유니언). 미지정 시 `unknown`.

## AppStructureGroupItem

하위 메뉴를 묶는 그룹. 라우팅 대상이 아니라 묶음.

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

- `code: string` — 항목 코드. 부모부터 dot 으로 이어져 화면을 식별(예: `inventory.goods-inventory`). 라우팅 경로·권한 키의 기준.
- `title: string` — 메뉴에 표시할 이름.
- `modules?: TModule[]` — 표시 조건(OR). 나열한 모듈 중 하나라도 활성(`usableModules`)이면 표시. 없으면 모듈과 무관하게 표시.
- `requiredModules?: TModule[]` — 표시 조건(AND). 나열한 모듈이 모두 활성이어야 표시.
- `icon?: string` — 메뉴 아이콘(@ng-icons SVG 문자열 등).
- `children: AppStructureItem<TModule>[]` — 하위 항목 배열. 그룹의 필수 필드(이게 있으면 그룹으로 판별). 표시 가능한 자식이 하나도 없으면 그룹도 메뉴에서 빠짐.

## AppStructureLeafItem

실제 화면(라우팅 대상) 항목.

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

- `code` / `title` / `modules` / `requiredModules` / `icon` — 그룹과 동일 의미.
- `perms?: ("use" | "edit")[]` — 이 화면에 부여 가능한 권한 종류. `"use"` = 조회 권한, `"edit"` = 편집 권한. 지정한 화면만 권한 페이지·권한 체크 대상이 됨. 생략하면 제약 없는 화면.
- `subPerms?: AppStructureSubPermission<TModule>[]` — 한 화면 안의 세부 기능 권한 목록.
- `url?: string` — 외부 링크 등 이동 경로. 일반 화면 라우팅 대신 외부로 보낼 때.
- `isNotMenu?: boolean` — 메뉴 노출 토글. `true` 면 사이드 메뉴에서 숨김(라우팅 대상 화면 자체는 유지). 홈·내정보 등 직접 진입 화면에 사용. 미지정/`false` 면 메뉴에 노출.

## AppStructureSubPermission

화면 내부의 세부 기능 권한.

```ts
interface AppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

- `code: string` — 세부 권한 코드. 화면 코드 뒤에 이어 붙어 권한 키를 이룸(`...code.subCode.perm`).
- `title: string` — 권한 페이지에 표시할 세부 기능 이름.
- `modules?: TModule[]` — 세부 권한 자체의 모듈 표시 조건(OR). 모듈 비활성이면 이 세부 권한은 평탄화에서 제외.
- `requiredModules?: TModule[]` — 세부 권한 자체의 모듈 표시 조건(AND).
- `perms: ("use" | "edit")[]` — 이 세부 기능에 부여 가능한 권한 종류. `"use"` = 조회, `"edit"` = 편집. leaf 의 `perms` 와 달리 필수.

## FlatPermission

`getFlatPermissions` 가 돌려주는 평탄화된 권한 한 줄. 권한 페이지 표시·권한 매칭에 쓰는 표현.

```ts
interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

- `titleChain: string[]` — 루트부터 이 권한까지의 표시명(`title`) 경로. 권한 페이지에서 계층 라벨로 사용.
- `codeChain: string[]` — 루트부터의 코드 경로 + 마지막에 권한 종류(`"use"`/`"edit"`)·세부코드가 붙은 전체 키. 권한 식별자.
- `modulesChain: TModule[][]` — 경로상 `modules` 를 가진 각 레벨의 `modules` 배열들의 모음. 이 권한이 어떤 모듈 조건에 묶였는지 표현.

## isUsableModules

```ts
function isUsableModules<TModule>(modules: TModule[] | undefined, requiredModules: TModule[] | undefined, usableModules: TModule[] | undefined): boolean
```

한 항목의 모듈 조건이 현재 활성 모듈로 충족되는지 판정.

- `modules` — OR 조건. 나열 중 하나라도 `usableModules` 에 있으면 통과. `undefined`/빈 배열이면 무조건 통과.
- `requiredModules` — AND 조건. 나열 전부가 `usableModules` 에 있어야 통과. `undefined`/빈 배열이면 통과로 간주.
- `usableModules` — 현재 앱에서 활성인 모듈 목록. `undefined` 이면 `modules` 를 가진 항목은 매칭 실패(통과 불가).
- 반환: requiredModules(AND)와 modules(OR)를 모두 만족하면 `true`.

```ts
import { isUsableModules } from "@simplysm/service-common";

isUsableModules(["A", "B"], undefined, ["A"]); // true — OR
isUsableModules(undefined, ["A", "B"], ["A"]); // false — AND 미충족
```

## isUsableModulesChain

```ts
function isUsableModulesChain<TModule>(modulesChain: TModule[][], requiredModulesChain: TModule[][], usableModules: TModule[] | undefined): boolean
```

경로상 모든 레벨의 모듈 조건이 충족되는지 판정(부모 조건 누적).

- `modulesChain` — 각 레벨의 `modules` 배열들. 모든 레벨이 OR 조건을 통과해야 함.
- `requiredModulesChain` — 각 레벨의 `requiredModules` 배열들. 모든 레벨이 AND 조건을 통과해야 함.
- `usableModules` — 현재 활성 모듈 목록.
- 반환: 빈 체인이면 `true`, 한 레벨이라도 막히면 `false`. 자식 표시 여부 판정에 사용.

## getFlatPermissions

```ts
function getFlatPermissions<TModule>(items: AppStructureItem<TModule>[], usableModules: TModule[] | undefined): FlatPermission<TModule>[]
```

앱 구조 트리를 BFS 로 순회해 활성 모듈로 표시 가능한 권한만 평탄 목록으로 추출.

- `items` — 앱 구조 배열(루트).
- `usableModules` — 현재 활성 모듈. 모듈 조건을 통과하지 못한 가지(그 자식·권한 포함)는 결과에서 빠짐.
- 동작: leaf 의 `perms` 각각, 그리고 `subPerms` 의 각 `perm` 을 한 줄(`FlatPermission`)로 펼침. `subPerms` 는 자체 모듈 조건도 추가로 검사. 빈 `items` 면 빈 배열.
- 반환: 표시 가능한 권한들의 평탄 배열. 권한 관리 화면(`<sd-permission-table>` 입력)·권한 매칭의 기반.

```ts
import { getFlatPermissions } from "@simplysm/service-common";

const perms = getFlatPermissions(adminAppStructureItems, ["scheduling"]);
// 각 perm.codeChain 이 전체 권한 키
```

> 주의: 앱 레이어에서는 보통 `SdAppStructureProvider` 의 메서드(`getPermissionsByStructure` 등)를 거쳐 사용한다(매뉴얼 `manuals/client-app-structure.md`). 위 함수들은 그 하부의 순수 판정·평탄화 로직이다.
