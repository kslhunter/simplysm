# @simplysm/angular — 라우팅 / 앱 구조(메뉴·권한)

해시 기반 SPA 내비게이션, 현재 페이지 코드·뷰타입·제목 신호, 앱 구조(AppStructureItem 트리)→메뉴/권한 변환, 권한 테이블 UI. 메뉴 컴포넌트(layout 군)·CRUD 컨테이너(crud 군)가 이 신호·타입을 소비.

## SdNavigateWindowProvider

`class SdNavigateWindowProvider` — 해시 라우트를 새 창/탭으로 여는 루트 프로바이더.

- `isWindow: boolean` — 현재가 별도 창 모드인지(해시 쿼리 `window=true`).
- `open(navigate, params?, features?)` — 라우트 열기. 창 모드이거나 `features` 있으면 `window.open` 으로 새 창(부모 unload 시 자동 닫힘), 아니면 새 탭(`_blank`).

## SdRouterLink

`[sdRouterLink]` 디렉티브 — 클릭 시 라우팅. Ctrl/Shift 클릭은 새 창, 창 모드는 팝업으로 분기.

- `option = input<{ link; params?; window?: { width?; height? }; outletName?; queryParams? } | undefined>()`(alias `sdRouterLink`) — 이동 정보. `link`(경로), `params`(matrix 파라미터), `queryParams`, `outletName`(보조 outlet), `window`(팝업 크기). `undefined` 면 비활성.

## 페이지 코드·타이틀·뷰타입 신호

컴포넌트 생성자/필드에서 호출하는 inject 함수. 라우터·활성모달 컨텍스트에서 값 도출.

- `injectFullPageCodeSignal(): Signal<string>` — 전체 라우트 경로를 `.` 연결 페이지 코드로 변환(예: `sale.order`). 메뉴 선택표시·제목 조회 기준.
- `injectCurrentPageCodeSignal(): Signal<string> | undefined` — 현재 활성 라우트 세그먼트 기준 코드(중첩 라우트용). 라우트 없으면 `undefined`.
- `injectViewTitleSignal(): Signal<string>` — 화면 제목. 활성 모달이면 모달 제목, 아니면 앱 구조에서 코드로 제목 조회.
- `injectViewTypeSignal(): Signal<SdViewType>` — `"page"|"modal"|"control"`. 모달 컨텍스트면 modal, 라우트 페이지 컴포넌트면 page, 그 외 control. `SdViewType` 타입 동봉.
- `setupCanDeactivate(fn: () => boolean): void` — 이탈 차단 등록. 모달이면 `canDeactivateFn`, 라우트면 route 의 `canDeactivate` 가드에 추가(파괴 시 해제). `fn()` 이 false 면 닫기/이탈 차단.

## 메뉴 유틸

`SdMenu` 를 라우터링크/선택판정으로 변환(layout 메뉴 컴포넌트가 사용).

- `getMenuRouterLinkOption(menu: SdMenu): { link; queryParams } | undefined` — 리프 메뉴면 `/home/{codeChain}` 링크 + 쿼리파라미터, 그룹/외부url 메뉴면 `undefined`.
- `getIsMenuSelected(menu, fullPageCode, customFn?): boolean` — 선택 여부. `customFn` 있으면 그 결과, 없으면 `fullPageCode === codeChain.join(".")`.

## SdAppStructureProvider

`class SdAppStructureProvider<TModule>` — 앱 구조(메뉴·권한) 트리 보관·계산 루트 프로바이더.

- `usableModules: WritableSignal<TModule[] | undefined>` — 활성 모듈 목록(메뉴/권한 필터링 기준).
- `permRecord: WritableSignal<Record<string, boolean> | undefined>` — 권한 레코드(`{코드.use: bool}`).
- `items: WritableSignal<AppStructureItem<TModule>[]>` — 원본 구조. `initialize(items)` 로 설정.
- `usableMenus: Signal<SdMenu[]>` — 모듈·권한 적용된 메뉴 트리.
- `usableFlatMenus: Signal<SdFlatMenu<TModule>[]>` — 평탄화 메뉴 목록.
- `getPermissionsByStructure(items, codeChain?)` / `getTitleByFullCode(fullCode)`(없으면 throw) / `findTitleByFullCode(fullCode)`(없으면 undefined, 결측 보존) / `getItemChainByFullCode(fullCode)` / `getPermsByFullCode(fullCodes, permKeys)`.

`injectPermsSignal<K>(viewCodes: string[], keys: K[]): Signal<K[]>` — 특정 화면코드들의 권한 중 보유 키만 반환하는 computed.

## SdAppStructureUtils

`abstract class SdAppStructureUtils` — 앱 구조 변환 정적 유틸(프로바이더가 위임). `getMenus`/`getFlatMenus`/`getPermissions`/`getFlatPermissions`/`getTitleByFullCode`/`findTitleByFullCode`/`getItemChainByFullCode`/`getPermsByFullCode` 정적 메서드 제공. 모듈 활성/권한 use 여부로 필터링.

## 타입

- `SdMenu` — 메뉴 노드. `title`/`codeChain: string[]`/`url?`/`icon?`/`children?`.
- `SdFlatMenu<TModule>` — 평탄 메뉴. `titleChain`/`codeChain`/`modulesChain`.
- `SdPermission<TModule>` — 권한 노드. `title`/`codeChain`/`modules`/`perms: ("use"|"edit")[] | undefined`/`children`.

## SdPermissionTable

`<sd-permission-table>` — 권한 트리 체크박스 표(use/edit 토글, 상하위 연동). 제네릭 `<TModule>`.

- `value = model<Record<string, boolean>>({})` — 권한 체크 상태(`{코드.use|edit: bool}`). use 해제 시 edit 자동 해제, edit 은 use 체크 후에만.
- `items = input<SdPermission<TModule>[]>([])` — 권한 트리(`getPermissionsByStructure` 결과).
- `disabled = input(false)` — 전체 비활성.
