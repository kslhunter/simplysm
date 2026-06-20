# @simplysm/angular — 라우팅·메뉴·권한(app-structure)

라우터 링크·현재 페이지 식별·뷰 컨텍스트(page/control/modal)·이탈 가드, 그리고 앱 구조 트리에서 메뉴·권한을 파생하는 군. 화면 컴포넌트의 표준 시그널 `viewType`, 권한 가드 `injectPermsSignal`, 사이드바/탑바 메뉴가 이 군에 의존. 메뉴·권한 정의 절차는 [client-app-structure.md](../../manuals/client-app-structure.md) 참조.

## 라우팅 디렉티브·프로바이더

### `SdRouterLink` — `[sdRouterLink]`

- `option: input<{ link: string; params?: Record<string,string>; window?: { width?: number; height?: number }; outletName?: string; queryParams?: Record<string,string> } | undefined>({ alias: "sdRouterLink" })` — 이동 대상. `link` = 라우트 경로, `params` = 라우트 파라미터, `outletName` 지정 시 named outlet, `window` 지정 시 팝업 창 크기.
- 클릭 동작: `Alt+click` 무시. 팝업 창 모드면 새 창; `Ctrl/Shift+click` 이면 새 탭/창; `outletName` 없으면 `Router.navigate([link, ...params])`; 있으면 outlet navigate.

### `SdNavigateWindowProvider`

`@Injectable({ providedIn: "root" })`.

- `get isWindow(): boolean` — 현재 hash query 에 `window=true` 가 있는지(팝업 창 컨텍스트 여부).
- `open(navigate: string, params?: Record<string,string>, features?: string): void` — 이미 팝업 창이거나 `features` 지정 시 새 브라우저 창(`window.open`), 아니면 `_blank` 탭으로 `#{navigate};{params}` 열기.

## 현재 페이지·뷰 식별

### `injectCurrentPageCodeSignal` / `injectFullPageCodeSignal`

```ts
function injectCurrentPageCodeSignal(): Signal<string> | undefined
function injectFullPageCodeSignal(): Signal<string>
```

- `injectCurrentPageCodeSignal` — `ActivatedRoute` 없으면 `undefined`; 있으면 활성 라우트 URL 세그먼트(앞 2개 제외)를 `"."` 로 이은 코드.
- `injectFullPageCodeSignal` — `Router` URL(`NavigationEnd` 추적)을 `/` 분리, 앞 2개 제외, `;`/`?` 접미 제거 후 `"."` 로 이은 페이지 코드. 메뉴 선택 판정 등에 사용.

### `injectViewTitleSignal`

```ts
function injectViewTitleSignal(): Signal<string>
```

- 활성 모달 안이면 모달 `title`, 아니면 `SdAppStructureProvider.findTitleByFullCode(...)` 로 화면 제목. 엑셀 파일명·탑바 제목 등에.

### `injectViewTypeSignal` / `SdViewType`

```ts
function injectViewTypeSignal(): Signal<SdViewType>
type SdViewType = "page" | "modal" | "control"
```

- `"modal"` = 활성 모달 안에서 렌더; `"page"` = 라우트가 있고 컴포넌트 selector·코드가 일치하는 최상위 페이지; `"control"` = 그 외(라우트 없음·임베드 재사용). 화면 컴포넌트가 `viewType = injectViewTypeSignal()` 으로 받아 `sd-crud-*`/`sd-base-container` 에 전달.

### `setupCanDeactivate`

```ts
function setupCanDeactivate(fn: () => boolean): void
```

- 이탈 가드 등록. 모달 컨텍스트면 `SdActivatedModalProvider.canDeactivateFn = fn`; 라우트 페이지면 route config 의 `canDeactivate` 에 `fn()` 반환 가드를 push(파괴 시 제거). `fn()` 이 false 면 이탈 차단. detail 의 미저장 변경 가드에 사용([client-component.md](../../manuals/client-component.md)).

## 메뉴 유틸

### `getMenuRouterLinkOption` / `getIsMenuSelected`

```ts
function getMenuRouterLinkOption(menu: SdMenu): { link: string; queryParams: Record<string,string> | undefined } | undefined
function getIsMenuSelected(menu: SdMenu, fullPageCode: string | undefined, customFn?: (menu: SdMenu) => boolean): boolean
```

- `getMenuRouterLinkOption` — 그룹 메뉴(`children != null`)·외부 링크(`url != null`)면 `undefined`; leaf 면 `link = "/home/" + codeChain.join("/")`(`?query` 는 `queryParams` 로 분리). 사이드바/탑바 메뉴가 라우터 링크 생성에 사용.
- `getIsMenuSelected` — `customFn` 있으면 그 결과, 아니면 `fullPageCode === menu.codeChain.join(".")`.

## 앱 구조 프로바이더

### `injectPermsSignal`

```ts
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

- 화면 fullCode(들)에 대해 사용자가 보유한 권한 action 키 배열을 `computed` 로 반환(`SdAppStructureProvider.getPermsByFullCode` 위임).

```ts
perms = injectPermsSignal(["inventory.outbound-instruction"], ["use", "edit"]);
// this.perms().includes("use")
```

### `SdAppStructureProvider<TModule>`

`@Injectable({ providedIn: "root" })`. 앱 메뉴·권한 트리의 단일 소스. 부트스트랩에서 `initialize(items)` 로 연결.

- 시그널: `usableModules: WritableSignal<TModule[] | undefined>` / `permRecord: WritableSignal<Record<string, boolean> | undefined>` / `items: WritableSignal<AppStructureItem<TModule>[]>`.
- computed: `usableMenus: Signal<SdMenu[]>` / `usableFlatMenus: Signal<SdFlatMenu<TModule>[]>`.
- 메서드:
  - `initialize(items): void` — `items` set.
  - `getPermissionsByStructure(items, codeChain?): SdPermission<TModule>[]` — 권한 테이블용 권한 트리.
  - `getTitleByFullCode(fullCode): string`(없으면 throw) / `findTitleByFullCode(fullCode): string | undefined`.
  - `getItemChainByFullCode(fullCode): AppStructureItem<TModule>[]`.
  - `getPermsByFullCode<K extends string>(fullCodes, permKeys): K[]`.

### `SdAppStructureUtils`

static 메서드만 가진 abstract class(`SdAppStructureProvider` 의 순수 함수 형태). `getTitleByFullCode`/`findTitleByFullCode`/`getPermsByFullCode`/`getItemChainByFullCode`/`getMenus`/`getFlatMenus`/`getPermissions`/`getFlatPermissions` — 각각 `items: AppStructureItem[]` 을 첫 인자로 받아 메뉴·권한·제목을 파생. provider 가 이를 시그널로 래핑.

## 타입

- `SdMenu` — `{ title: string; codeChain: string[]; url?: string; icon?: string; children?: SdMenu[] }`. 메뉴 트리 노드. 사이드바/탑바 메뉴가 소비.
- `SdFlatMenu<TModule>` — `{ titleChain: string[]; codeChain: string[]; modulesChain: TModule[][] }`. leaf 메뉴를 평탄화한 형태.
- `SdPermission<TModule>` — `{ title: string; codeChain: string[]; modules: TModule[] | undefined; perms: ("use"|"edit")[] | undefined; children: SdPermission<TModule>[] | undefined }`. 권한 트리 노드(`perms`: `"use"`=조회·`"edit"`=편집). `SdPermissionTable` 의 `items` 입력 타입([crud.md](./crud.md)).
