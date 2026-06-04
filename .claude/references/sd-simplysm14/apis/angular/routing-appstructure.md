# @simplysm/angular — 라우팅 / 앱 구조(메뉴·권한)

라우터 링크·현재 페이지 식별·뷰 컨텍스트(page/control/modal)·이탈 가드, 그리고 앱 구조 트리에서 메뉴·권한을 파생하는 군. 화면 컴포넌트의 표준 시그널 `viewType`, 권한 가드 `injectPermsSignal`, 사이드바/탑바 메뉴가 이 군에 의존.

## injectViewTypeSignal / SdViewType

```ts
function injectViewTypeSignal(): Signal<SdViewType>
type SdViewType = "page" | "modal" | "control"
```

현재 컴포넌트가 어느 컨텍스트에서 동작 중인지 판정하는 signal. `"page"` = 라우팅 진입 화면, `"modal"` = 모달로 열림, `"control"` = 다른 화면 안에 임베드된 자식. 판정 기준: 모달 컨텍스트면 modal, 라우트 컴포넌트의 selector 가 현재 엘리먼트 태그와 일치하고 full/current 페이지 코드가 같으면 page, 그 외 control. 매뉴얼 표준 시그널 `viewType = injectViewTypeSignal()` 로 받아 `sd-base-container [viewType]` 에 전달.

## injectViewTitleSignal

- `function injectViewTitleSignal(): Signal<string>` — 현재 뷰의 표시 제목. 모달이면 모달 컴포넌트 `title`, 아니면 앱 구조에서 현재 페이지 코드로 찾은 제목(`[상위 > 경로] 현재`). 못 찾으면 `""`. `sd-base-container` 가 page 탑바 제목에 사용.

## injectFullPageCodeSignal / injectCurrentPageCodeSignal

- `function injectFullPageCodeSignal(): Signal<string>` — 라우터 URL 전체에서 파생한 페이지 코드(`/` → `.` 로 합침, 앞 2세그먼트 제외, `;`/`?` 이후 제거). 메뉴 선택 상태·뷰 타입 판정에 사용.
- `function injectCurrentPageCodeSignal(): Signal<string> | undefined` — 현재 `ActivatedRoute` 기준 상대 페이지 코드. 라우트 컨텍스트 없으면 `undefined`. 중첩 라우트에서 자기 위치 코드가 필요할 때.

## setupCanDeactivate

- `function setupCanDeactivate(fn: () => boolean): void` — 라우터 이탈/모달 닫기 시점에 `fn()` 이 false 면 이탈/닫기를 차단. 모달 컨텍스트면 `SdActivatedModalProvider.canDeactivateFn` 에, 라우트 컨텍스트면 해당 route 의 `canDeactivate` 에 등록(파괴 시 자동 해제). detail 화면의 변경 가드 표준: `setupCanDeactivate(() => this._checkIgnoreChanges())`(client-component.md).

## SdRouterLink (`[sdRouterLink]`)

라우터 이동을 호스트 클릭에 붙이는 디렉티브. Ctrl/Shift 클릭·window 모드면 새 창/탭으로 분기.

- `sdRouterLink: { link: string; params?: Record<string,string>; window?: { width?; height? }; outletName?: string; queryParams?: Record<string,string> } | undefined` — 이동 옵션.
  - `link` — 라우트 경로. `outletName` 있으면 named outlet 이동.
  - `params` — 매트릭스 파라미터, `queryParams` — 쿼리 파라미터.
  - `window` — Ctrl/Shift 클릭 또는 window 컨텍스트일 때 팝업 창 크기(기본 800x800).
  - 미지정(`undefined`) 이면 클릭 무시 + 커서 기본. 메뉴 항목이 leaf 가 아닐 때 등.
- Alt+클릭은 무시. 사이드바/탑바 메뉴가 `getMenuRouterLinkOption(menu)` 결과를 이 입력에 바인딩.

## SdNavigateWindowProvider

- `isWindow: boolean` — 현재 문서가 `window=true` 로 열린 팝업인지(해시 파라미터 검사).
- `open(navigate: string, params?: Record<string,string>, features?: string): void` — 새 창/탭으로 라우트 열기. window 컨텍스트이거나 `features` 가 있으면 `window=true` 팝업으로(부모 unload 시 자동 close), 아니면 `_blank` 탭으로. `SdRouterLink` 내부 + 화면에서 보조 창을 띄울 때.

## SdAppStructureProvider<TModule> / injectPermsSignal

앱 구조 트리(`AppStructureItem[]`, `@simplysm/service-common`)에서 메뉴·권한을 파생하는 root provider. 화면은 보통 `injectPermsSignal` 만 직접 씀.

```ts
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

- `viewCodes` — 권한 path 목록(도메인 트리 좌표). `keys` — 확인할 action 목록. 반환 signal 은 사용자가 보유한 action 들의 배열. 매뉴얼 패턴: `perms = injectPermsSignal(["inventory.outbound"], ["use","edit"])` → `this.perms().includes("use")` 인라인 가드.
- provider 멤버:
  - `usableModules: WritableSignal<TModule[] | undefined>` / `permRecord: WritableSignal<Record<string, boolean> | undefined>` — 인증 후 주입하는 활성 모듈·권한 레코드. 메뉴/권한 계산의 입력.
  - `items: WritableSignal<AppStructureItem<TModule>[]>` / `initialize(items): void` — 앱 구조 트리 세팅.
  - `usableMenus: Signal<SdMenu[]>` — 권한·모듈 필터를 적용한 트리형 메뉴(사이드바용).
  - `usableFlatMenus: Signal<SdFlatMenu<TModule>[]>` — 평탄화된 메뉴 목록(검색/전체메뉴용).
  - `getPermsByFullCode<K>(fullCodes, permKeys): K[]` — 코드 목록에 대해 보유 action 계산(`injectPermsSignal` 내부). 권한 정의 자체가 없는 항목은 모든 action 허용으로 간주.
  - `getPermissionsByStructure(items, codeChain?)` — 권한표(`sd-permission-table`)용 `SdPermission` 트리 생성.
  - `findTitleByFullCode(fullCode): string | undefined` / `getTitleByFullCode(fullCode): string`(못 찾으면 throw) / `getItemChainByFullCode(fullCode)` — 코드로 제목·항목 체인 조회.

## SdAppStructureUtils (static 유틸)

`SdAppStructureProvider` 가 내부적으로 쓰는 순수 함수 모음(abstract 클래스의 static). 트리 → 메뉴/권한/제목 변환을 provider 밖에서 직접 할 때만 사용.

- `getMenus(items, codeChain, usableModules, permRecord): SdMenu[]` — 모듈·`use` 권한 필터 적용 트리 메뉴. `isNotMenu` 항목·빈 그룹 제외.
- `getFlatMenus(items, usableModules, permRecord): SdFlatMenu[]` — BFS 평탄화 메뉴.
- `getPermissions(items, codeChain, usableModules): SdPermission[]` — 권한표용 트리(leaf 의 `perms`/`subPerms` 포함).
- `getFlatPermissions(items, usableModules)` / `findTitleByFullCode` / `getTitleByFullCode` / `getItemChainByFullCode` / `getPermsByFullCode` — provider 동명 메서드의 구현.

## menu-utils

- `getMenuRouterLinkOption(menu: SdMenu): { link: string; queryParams: Record<string,string> | undefined } | undefined` — 메뉴를 `sdRouterLink` 옵션으로 변환. children 이 있거나 `url`(외부 링크) 이면 `undefined`(이동 불가 = leaf 아님). 그 외 `codeChain` 으로 `/home/<코드/...>` 링크 + 쿼리 분리.
- `getIsMenuSelected(menu: SdMenu, fullPageCode: string | undefined, customFn?: (menu) => boolean): boolean` — 메뉴 선택 여부. `customFn` 있으면 위임, 없으면 `fullPageCode === menu.codeChain.join(".")`.

## 타입

- `SdMenu = { title; codeChain: string[]; url?; icon?; children?: SdMenu[] }` — 트리 메뉴 항목. `url` 있으면 외부 링크, `children` 있으면 그룹.
- `SdFlatMenu<TModule> = { titleChain: string[]; codeChain: string[]; modulesChain: TModule[][] }` — 평탄 메뉴(경로 누적).
- `SdPermission<TModule> = { title; codeChain; modules; perms: ("use"|"edit")[] | undefined; children }` — 권한표 노드. `perms` 가 undefined 면 그룹(권한 없음). `sd-permission-table` 의 `items` 입력 타입.
