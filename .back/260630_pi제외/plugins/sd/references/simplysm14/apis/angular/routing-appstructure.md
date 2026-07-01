# @simplysm/angular — 라우팅·앱구조·권한

라우터 링크, page code/title/type signal, modal/page 이탈 가드, 앱 구조 트리에서 메뉴·권한을 계산하는 군이다. 앱 메뉴·권한 정의 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)

## 라우팅

### `SdNavigateWindowProvider`

```ts
class SdNavigateWindowProvider {
  get isWindow(): boolean;
  open(navigate: string, params?: Record<string, string>, features?: string): void;
}
```

- `isWindow` — `location.hash` 의 `;` 뒤 query에서 `window=true` 인지 판단한다.
- `navigate` — hash path로 쓸 이동 문자열.
- `params` — `URLSearchParams` 로 직렬화해 `;` 뒤에 붙일 route matrix-like parameter 객체.
- `features` — `window.open` 세 번째 인자. 있으면 현재 창이 window가 아니어도 별도 popup 방식으로 연다.
- open 동작 — 현재 창이 window이거나 features가 있으면 `window=true` 를 params에 넣어 open하고 beforeunload 때 연 자식 창을 닫는다. 아니면 `_blank` 로 연다.

### `SdRouterLink` — `[sdRouterLink]`

```ts
class SdRouterLink {
  option: InputSignal<{
    link: string;
    params?: Record<string, string>;
    window?: { width?: number; height?: number };
    outletName?: string;
    queryParams?: Record<string, string>;
  } | undefined>;
  onClick(event: MouseEvent): Promise<void>;
}
```

- `option` — undefined면 cursor/click 동작이 없다.
- `link` — router navigate path 또는 새 창 hash path.
- `params` — normal navigate에서는 route segment parameter, window open에서는 `;` 뒤 query parameter.
- `window.width`/`window.height` — 현재 창이 window일 때 자식 popup features에 쓸 크기. 기본 800/800.
- `outletName` — 지정하면 `{ outlets: { [outletName]: link } }` 로 navigate한다. 없으면 `[link, params?]` 로 navigate한다.
- `queryParams` — navigate options queryParams이거나 window hash path 뒤 `?` query string.
- click 동작 — Alt+click은 무시, Ctrl/Shift+click은 새 창, 현재 window 안 click은 popup, 일반 click은 Router.navigate.

### page code/title/type signal

```ts
function injectCurrentPageCodeSignal(): Signal<string> | undefined;
function injectFullPageCodeSignal(): Signal<string>;
function injectViewTitleSignal(): Signal<string>;
function injectViewTypeSignal(): Signal<SdViewType>;
type SdViewType = "page" | "modal" | "control";
```

- `injectCurrentPageCodeSignal` — optional `ActivatedRoute` 가 있으면 `pathFromRoot.slice(2)` url segment들을 `.` 로 이어 Signal을 반환하고, 없으면 `undefined`.
- `injectFullPageCodeSignal` — `Router.url` 과 `NavigationEnd.url` 에서 `/` 기준 2번째 segment 이후를 읽고 `;`/`?` 이후를 제거해 `.` 로 이어 Signal을 반환한다.
- `injectViewTitleSignal` — activated modal 안이면 modal title, 아니면 `SdAppStructureProvider.findTitleByFullCode(currPageCode ?? fullPageCode) ?? ""`.
- `injectViewTypeSignal` — activated modal이면 `"modal"`; route component selector와 host tag가 일치하고 full/current page code가 같으면 `"page"`; 그 외 `"control"`.
- `"page"` — 라우팅 component 자체 view.
- `"modal"` — `SdActivatedModalProvider` 가 주입된 modal content.
- `"control"` — page/modal 내부에 들어간 child control view.

### `setupCanDeactivate`

```ts
function setupCanDeactivate(fn: () => boolean): void
```

- `fn` — 이탈 가능 여부를 반환하는 동기 함수.
- modal 동작 — `SdActivatedModalProvider` 가 있으면 `canDeactivateFn` 에 할당한다.
- route 동작 — 현재 `ActivatedRoute.routeConfig.canDeactivate` 배열에 wrapper guard를 push하고 destroy 때 제거한다.
- selector 조건 — route component selector와 현재 host tag가 다르면 child control로 보고 route guard를 추가하지 않는다.

### menu router helpers

```ts
function getMenuRouterLinkOption(menu: SdMenu): { link: string; queryParams: Record<string, string> | undefined } | undefined;
function getIsMenuSelected(menu: SdMenu, fullPageCode: string | undefined, customFn?: (menu: SdMenu) => boolean): boolean;
```

- `menu` — `SdMenu` tree item.
- `getMenuRouterLinkOption` — `menu.children` 또는 `menu.url` 이 있으면 undefined, leaf internal menu면 `/home/{codeChain.join("/")}` link와 queryParams를 만든다.
- `queryParams` — codeChain의 마지막 문자열에 `?` 가 있으면 `URLSearchParams` 로 객체화한다.
- `fullPageCode` — 현재 full page code. 기본 선택 판정에서 `menu.codeChain.join(".")` 와 비교한다.
- `customFn` — 있으면 기본 비교 대신 이 함수의 boolean 결과를 사용한다.

## 앱 구조 provider

### `injectPermsSignal` / `SdAppStructureProvider<TModule>`

사용법: [client-app-structure.md](../../manuals/client-app-structure.md)

```ts
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>;
class SdAppStructureProvider<TModule = unknown> {
  usableModules: WritableSignal<TModule[] | undefined>;
  permRecord: WritableSignal<Record<string, boolean> | undefined>;
  items: WritableSignal<AppStructureItem<TModule>[]>;
  initialize(items: AppStructureItem<TModule>[]): void;
  usableMenus: Signal<SdMenu[]>;
  usableFlatMenus: Signal<SdFlatMenu<TModule>[]>;
  getPermissionsByStructure(items: AppStructureItem<TModule>[], codeChain?: string[]): SdPermission<TModule>[];
  getTitleByFullCode(fullCode: string): string;
  findTitleByFullCode(fullCode: string): string | undefined;
  getItemChainByFullCode(fullCode: string): AppStructureItem<TModule>[];
  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[];
}
```

- `viewCodes` — 권한을 확인할 full code 배열.
- `keys` — 반환 후보 permission key 배열.
- `injectPermsSignal` — `SdAppStructureProvider.getPermsByFullCode(viewCodes, keys)` 를 computed signal로 반환한다.
- `usableModules` — module 조건 필터링 기준. undefined면 조건 없는 항목은 통과한다.
- `permRecord` — `{ "full.code.perm": boolean }` 형태 권한 record. undefined면 권한 보유 결과가 빈 배열이 된다.
- `items` — 앱 구조 원본 배열 signal.
- `initialize` — `items` signal에 앱 구조 배열을 set한다.
- `usableMenus` — `items`, `usableModules`, `permRecord` 를 반영한 menu tree.
- `usableFlatMenus` — 표시 가능한 leaf 메뉴를 title/code/module chain으로 평탄화한 배열.
- `getPermissionsByStructure` — 권한 관리 UI에 넘길 permission tree를 만든다.
- `getTitleByFullCode` — item을 못 찾으면 throw한다.
- `findTitleByFullCode` — item을 못 찾으면 undefined, 찾으면 parent title chain을 `[A > B] C` 형식으로 붙인다.
- `getItemChainByFullCode` — fullCode를 `.` 로 나눠 트리에서 찾은 item chain. 중간에 없으면 빈 배열.
- `getPermsByFullCode` — permRecord에 명시된 key이거나 대상 item에 `perms` 필드가 없으면 해당 key를 반환한다.

### `SdAppStructureUtils`

```ts
abstract class SdAppStructureUtils {
  static getTitleByFullCode<TModule>(items: AppStructureItem<TModule>[], fullCode: string): string;
  static findTitleByFullCode<TModule>(items: AppStructureItem<TModule>[], fullCode: string): string | undefined;
  static getPermsByFullCode<TModule, K extends string>(items: AppStructureItem<TModule>[], fullCodes: string[], permKeys: K[], permRecord: Record<string, boolean> | undefined): K[];
  static getItemChainByFullCode<TModule>(items: AppStructureItem<TModule>[], fullCode: string): AppStructureItem<TModule>[];
  static getMenus<TModule>(items: AppStructureItem<TModule>[], codeChain: string[], usableModules: TModule[] | undefined, permRecord: Record<string, boolean> | undefined): SdMenu[];
  static getFlatMenus<TModule>(items: AppStructureItem<TModule>[], usableModules: TModule[] | undefined, permRecord: Record<string, boolean> | undefined): SdFlatMenu<TModule>[];
  static getPermissions<TModule>(items: AppStructureItem<TModule>[], codeChain: string[], usableModules: TModule[] | undefined): SdPermission<TModule>[];
  static getFlatPermissions<TModule>(items: AppStructureItem<TModule>[], usableModules: TModule[] | undefined): ReturnType<typeof getFlatPermissions>;
}
```

- `items` — app-structure tree 원본.
- `fullCode` — `.` 로 이어진 code path.
- `permKeys` — 검사할 permission key 후보.
- `permRecord` — 권한 boolean record. nullish면 `getPermsByFullCode` 는 빈 배열.
- `codeChain` — 재귀 호출에서 누적되는 parent code 배열.
- `usableModules` — module/requiredModules 필터 기준.
- `getMenus` 동작 — `isNotMenu` 항목 제외, module 조건 제외, leaf는 `perms` 가 있으면 `.use` 권한이 있어야 포함한다.
- `getFlatMenus` 동작 — BFS로 leaf를 펼치고 title/code/modules chain을 반환한다.
- `getPermissions` 동작 — module 조건을 통과한 group/leaf/subPerms를 `SdPermission` tree로 바꾼다.

## 앱 구조 타입

### `SdMenu`, `SdFlatMenu`, `SdPermission`

```ts
interface SdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: SdMenu[];
}
interface SdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
interface SdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: SdPermission<TModule>[] | undefined;
}
```

- `SdMenu.title` — 메뉴 표시명.
- `SdMenu.codeChain` — root부터 현재 항목까지의 code 배열.
- `SdMenu.url` — 외부 URL. 있으면 menu click이 `window.open(url, "_blank")` 흐름에서 쓰인다.
- `SdMenu.icon` — menu icon SVG 문자열.
- `SdMenu.children` — 하위 menu 배열. 있으면 group menu.
- `SdFlatMenu.titleChain` — root부터 leaf까지 title 배열.
- `SdFlatMenu.codeChain` — root부터 leaf까지 code 배열.
- `SdFlatMenu.modulesChain` — 경로상 module 배열들의 chain.
- `SdPermission.title` — 권한 table 표시명.
- `SdPermission.codeChain` — 권한 code path 배열.
- `SdPermission.modules` — 이 권한 항목의 module 조건 배열.
- `SdPermission.perms` — 이 항목에서 직접 부여 가능한 `"use"`/`"edit"` 권한 배열.
- `SdPermission.children` — group 또는 subPerms에서 파생된 하위 권한 배열.
