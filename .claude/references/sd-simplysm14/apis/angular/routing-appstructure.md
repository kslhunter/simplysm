# @simplysm/angular — 라우팅·메뉴·권한(app-structure)

라우터 링크·현재 페이지 식별·뷰 컨텍스트(page/control/modal)·이탈 가드, 그리고 앱 구조 트리에서 메뉴·권한을 파생하는 군. 화면 컴포넌트의 표준 시그널 `viewType`, 권한 가드 `injectPermsSignal`, 사이드바/탑바 메뉴가 이 군에 의존.

## 페이지 코드·뷰 타입·제목 시그널

injection 컨텍스트에서 호출하는 헬퍼들. 현재 라우트 상태를 시그널로 노출.

- `injectFullPageCodeSignal(): Signal<string>` — 전체 URL 경로를 점(`.`) 연결 코드로 반환(`/home/a/b` → `"a.b"`). 라우팅 변경 시 갱신.
- `injectCurrentPageCodeSignal(): Signal<string> | undefined` — 현재 컴포넌트 기준 상대 페이지 코드. `ActivatedRoute` 없으면 `undefined`.
- `injectViewTitleSignal(): Signal<string>` — 현재 화면 제목. 모달이면 모달 제목, 아니면 앱 구조에서 코드로 찾은 제목.
- `injectViewTypeSignal(): Signal<SdViewType>` — 화면이 동작 중인 컨텍스트. `SdViewType = "page"|"modal"|"control"`. 라우팅 진입(셀렉터=현재 코드)이면 `"page"`, 모달이면 `"modal"`, view 의 자식 등이면 `"control"`. `sd-base-container`/`sd-crud-*` 의 `[viewType]` 입력에 그대로 전달.

```ts
viewType = injectViewTypeSignal();
viewTitle = injectViewTitleSignal();
```

## setupCanDeactivate

라우터/모달 이탈 시점에 호출되는 가드를 등록. injection 컨텍스트에서 호출.

- `setupCanDeactivate(fn: () => boolean): void` — `fn()` 이 `false` 면 이탈 차단. 모달이면 `SdActivatedModalProvider.canDeactivateFn` 설정, 페이지면 route 의 `canDeactivate` 에 push(파괴 시 자동 제거). detail 화면의 변경사항 가드에 사용.

```ts
setupCanDeactivate(() => this._orgData == null || obj.equal(this.data(), this._orgData) || confirm("변경사항이 있습니다. 진행할까요?"));
```

## SdNavigateWindowProvider

새 창/탭으로 라우트를 여는 프로바이더. 현재 컨텍스트가 창 모드인지 판별.

- `isWindow: boolean` — 현재가 `window=true` 쿼리로 열린 창인지.
- `open(navigate: string, params?: Record<string,string>, features?: string): void` — 창 모드이거나 `features` 가 있으면 `window.open` 으로 새 창(beforeunload 시 자식 창 정리), 아니면 `_blank` 새 탭으로 라우트 열기.

## SdRouterLink

`[sdRouterLink]` 디렉티브. 클릭 시 옵션에 따라 라우팅/새 창/아웃렛 이동.

- `sdRouterLink` (option) — `{ link, params?, window?: { width?, height? }, outletName?, queryParams? }`. `link` 가 이동 경로, `params` 가 matrix 파라미터, `window` 가 창 크기, `outletName` 이 named outlet, `queryParams` 가 쿼리. Ctrl/Shift+클릭이면 새 창, 창 모드면 팝업 창, 아니면 `Router.navigate`. Alt+클릭은 무시.

```html
<a [sdRouterLink]="{ link: '/home/goods/detail', params: { id: '5' } }">상세</a>
```

## 메뉴 유틸 (menu-utils)

`SdMenu` 로부터 라우터 링크 옵션·선택 여부를 계산. 사이드바/탑바 메뉴가 사용.

- `getMenuRouterLinkOption(menu: SdMenu): { link, queryParams } | undefined` — leaf 메뉴면 `"/home/"+코드체인` 링크와 쿼리파라미터 반환, 그룹/외부 url 메뉴면 `undefined`.
- `getIsMenuSelected(menu, fullPageCode?, customFn?): boolean` — `customFn` 있으면 그것으로, 없으면 현재 fullPageCode 와 메뉴 코드체인 일치 여부.

## SdAppStructureProvider<TModule>

앱 메뉴·권한 트리(`AppStructureItem[]`)에서 사용 가능 메뉴·권한을 파생하는 전역 프로바이더. `providedIn: "root"`.

- `usableModules: WritableSignal<TModule[] | undefined>` — 사용자가 보유한 모듈. 메뉴/권한 필터에 사용.
- `permRecord: WritableSignal<Record<string, boolean> | undefined>` — `"코드.액션"→보유여부` 권한 맵.
- `items: WritableSignal<AppStructureItem<TModule>[]>` — 앱 구조 원본.
- `initialize(items)` — 구조 트리 주입.
- `usableMenus`/`usableFlatMenus` — 모듈·권한으로 필터된 메뉴 트리/평면 메뉴(computed).
- `getPermsByFullCode(fullCodes, permKeys): K[]` — 해당 코드들에서 보유한 권한 키 배열. 권한 정의 자체가 없는 항목은 모든 키 통과.
- `getTitleByFullCode`/`findTitleByFullCode` — 코드로 제목 조회(전자는 미발견 시 throw, 후자는 `undefined`).
- `getItemChainByFullCode`/`getPermissionsByStructure` — 코드 체인·권한 트리 조회.

## injectPermsSignal

화면 컴포넌트가 권한을 시그널로 받는 헬퍼. injection 컨텍스트에서 호출.

- `injectPermsSignal<K>(viewCodes: string[], keys: K[]): Signal<K[]>` — `viewCodes` 권한 path 들에서 사용자가 보유한 `keys` 만 담은 배열을 반환. 템플릿/코드에서 `perms().includes("edit")` 식으로 인라인 가드.

```ts
perms = injectPermsSignal(["inventory.outbound"], ["use", "edit"]);
// this.perms().includes("use")
```

## SdAppStructureUtils

`AppStructureItem[]` 에서 메뉴/권한/제목을 계산하는 정적 메서드 모음(추상 클래스). 대개 `SdAppStructureProvider` 가 내부에서 호출하지만 직접 쓸 수도 있음.

- `getMenus(items, codeChain, usableModules, permRecord): SdMenu[]` — 모듈·`use` 권한으로 필터된 메뉴 트리.
- `getFlatMenus(...)`: `SdFlatMenu[]` — 평면 메뉴(BFS, titleChain/codeChain/modulesChain 보유).
- `getPermissions(items, codeChain, usableModules): SdPermission[]` — 권한 트리(subPerms 를 children 으로).
- `getTitleByFullCode`/`findTitleByFullCode`/`getItemChainByFullCode`/`getPermsByFullCode`/`getFlatPermissions` — provider 와 동일 동작의 정적 버전.

## 타입 (sd-app-structure.types)

- `SdMenu` — `{ title; codeChain: string[]; url?; icon?; children? }`. 사이드바/탑바 메뉴 렌더 단위.
- `SdFlatMenu<TModule>` — `{ titleChain: string[]; codeChain: string[]; modulesChain: TModule[][] }`. 검색용 평면 메뉴.
- `SdPermission<TModule>` — `{ title; codeChain; modules; perms: ("use"|"edit")[] | undefined; children }`. 권한표(`sd-permission-table`) 입력 단위.
