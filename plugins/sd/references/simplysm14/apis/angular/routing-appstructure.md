# @simplysm/angular — 라우팅·앱구조·권한

라우터 링크, 현재 page code/title/type signal, modal/page 이탈 가드, 앱 구조 트리에서 메뉴·권한을 계산하는 군임. 앱 메뉴·권한 정의 사용법: [client-app-structure.md](../../manuals/client-app-structure.md)

## 라우터 링크·창

### `SdNavigateWindowProvider`

```ts
@Injectable({ providedIn: "root" })
class SdNavigateWindowProvider {
  get isWindow(): boolean;
  open(navigate: string, params?: Record<string, string>, features?: string): void;
}
```

- `isWindow` — `location.hash` 의 `;` 뒤 query에서 `window === "true"` 인지. 현재 화면이 팝업 창인지 판단.
- `open` — `isWindow` 이거나 `features` 가 있으면 `window.open(... ;window=true, "", features)` 로 자식 창을 열고 `_openedWindows` 추적(parent의 `beforeunload` 때 모두 닫음). 아니면 `_blank` 새 탭으로 엶.

### `SdRouterLink` (`[sdRouterLink]`)

```ts
@Directive({ selector: "[sdRouterLink]" })
class SdRouterLink {
  option: InputSignal<SdRouterLinkOption | undefined>; // alias "sdRouterLink"
}
type SdRouterLinkOption = {
  link: string;
  params?: Record<string, string>;
  window?: { width?: number; height?: number };
  outletName?: string;
  queryParams?: Record<string, string>;
};
```

host에 `cursor:pointer`(option 있을 때) + click 핸들러를 붙이는 디렉티브.

- `option` — `[sdRouterLink]` alias. 없으면 클릭 무시. `link` 이동 경로, `params` route param, `queryParams` 쿼리, `outletName` 명명 outlet, `window` 팝업 크기(기본 800×800).
- click 동작 — Alt+click은 무시(브라우저 다운로드). `isWindow` 면 사이즈 팝업으로 open, `Ctrl`/`Shift` 면 새 탭 open, 그 외엔 `router.navigate`(outletName 있으면 named outlet).

## 현재 화면 signal

```ts
function injectCurrentPageCodeSignal(): Signal<string> | undefined;
function injectFullPageCodeSignal(): Signal<string>;
function injectViewTitleSignal(): Signal<string>;
function injectViewTypeSignal(): Signal<SdViewType>;
type SdViewType = "page" | "modal" | "control";
```

- `injectCurrentPageCodeSignal` — `ActivatedRoute` 가 없으면 `undefined`. 있으면 `pathFromRoot.slice(2)` 각 route의 url segment를 `.` 로 이어 현재 페이지 code를 만듦.
- `injectFullPageCodeSignal` — `Router.url` 기반. `/` 분리 후 `slice(2)`, 각 segment에서 `;`/`?` 앞만 취해 `.` 로 이어 full page code 생성.
- `injectViewTitleSignal` — 모달 안이면 `modalComponent()?.title()`, 아니면 `SdAppStructureProvider.findTitleByFullCode(current ?? full)` (없으면 `""`).
- `injectViewTypeSignal` — 화면 종류. `"modal"`(모달 안), `"page"`(route component selector가 host tag와 일치 && full===current page code), `"control"`(그 외 기본). CRUD/base container가 레이아웃 분기에 씀.

### `setupCanDeactivate`

```ts
function setupCanDeactivate(fn: () => boolean): void;
```

`fn` 은 화면 이탈 허용 여부. 모달 컨텍스트면 `SdActivatedModalProvider.canDeactivateFn` 에 설정, route 컨텍스트면 route `canDeactivate` 가드에 push(컴포넌트 destroy 시 splice). component selector가 host tag와 불일치하면 등록 안 함.

## 메뉴 helper

```ts
function getMenuRouterLinkOption(
  menu: SdMenu,
): { link: string; queryParams: Record<string, string> | undefined } | undefined;
function getIsMenuSelected(
  menu: SdMenu,
  fullPageCode: string | undefined,
  customFn?: (menu: SdMenu) => boolean,
): boolean;
```

- `getMenuRouterLinkOption` — `menu.children` 또는 `menu.url` 이 있으면 `undefined`(그룹·외부링크는 router link 아님). 아니면 `codeChain.join("/")` 의 `?` 앞을 path(`/home/<path>`)로, 뒤를 `queryParams` 로 파싱.
- `getIsMenuSelected` — `customFn` 있으면 그 결과, 없으면 `fullPageCode === codeChain.join(".")`.

## 앱 구조·권한

### `SdAppStructureProvider<TModule>` / `injectPermsSignal`

```ts
@Injectable({ providedIn: "root" })
class SdAppStructureProvider<TModule = unknown> {
  usableModules: WritableSignal<TModule[] | undefined>;
  permRecord: WritableSignal<Record<string, boolean> | undefined>;
  items: WritableSignal<AppStructureItem<TModule>[]>;
  usableMenus: Signal<SdMenu[]>;
  usableFlatMenus: Signal<SdFlatMenu<TModule>[]>;
  initialize(items: AppStructureItem<TModule>[]): void;
  getPermissionsByStructure(items, codeChain?): SdPermission<TModule>[];
  getTitleByFullCode(fullCode: string): string; // 없으면 throw
  findTitleByFullCode(fullCode: string): string | undefined;
  getItemChainByFullCode(fullCode: string): AppStructureItem<TModule>[];
  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[];
}
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>;
```

앱 구조 트리(`AppStructureItem`)에서 사용 가능한 메뉴/권한을 계산하는 root 서비스. 권한은 모듈만, 메뉴는 모듈+권한 모두 체크함.

- `usableModules` — 현재 사용자/테넌트의 활성 모듈. `permRecord` — `"<fullCode>.<perm>"` → boolean 평탄 권한 맵. `items` — 원본 구조 트리.
- `initialize` — `items` 설정.
- `usableMenus`/`usableFlatMenus` — 필터된 메뉴 트리/평탄 leaf 메뉴(computed).
- `getTitleByFullCode`/`findTitleByFullCode` — fullCode로 타이틀(`[부모 > 부모] 현재` 형식). get은 없으면 throw.
- `getPermsByFullCode` — fullCodes의 leaf에서 가진 permKey들. `injectPermsSignal(viewCodes, keys)` 는 이를 computed로 래핑.

### `SdMenu` / `SdFlatMenu<TModule>` / `SdPermission<TModule>`

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

- `SdMenu.codeChain` — 이중 용도: `.join("/")` → routerLink 경로, `.join(".")` → 선택 판정 key. `children` 있으면 그룹 메뉴, `url` 있으면 외부 링크.
- `SdFlatMenu` — `titleChain`/`codeChain` 경로 + `modulesChain`(체인을 따라 누적된 모듈 요구).
- `SdPermission.perms` — `"use"`/`"edit"` literal 배열(그룹 노드는 `undefined`). `SdPermissionTable` 입력 트리로 쓰임.

### `SdAppStructureUtils` (abstract, static)

```ts
abstract class SdAppStructureUtils {
  static getTitleByFullCode(items, fullCode): string;       // 없으면 throw
  static findTitleByFullCode(items, fullCode): string | undefined;
  static getPermsByFullCode(items, fullCodes, permKeys, permRecord): K[];
  static getItemChainByFullCode(items, fullCode): AppStructureItem[];
  static getMenus(items, codeChain, usableModules, permRecord): SdMenu[];
  static getFlatMenus(items, usableModules, permRecord): SdFlatMenu[];
  static getPermissions(items, codeChain, usableModules): SdPermission[];
  static getFlatPermissions(items, usableModules): ...;
}
```

`SdAppStructureProvider` 가 위임하는 순수 계산 유틸.

- `getMenus` — `isNotMenu`/모듈 미충족/권한(`<code>.use` falsy) leaf 제외, 자식 있는 그룹만 포함.
- `getFlatMenus` — BFS로 평탄화(titleChain/codeChain/modulesChain 누적).
- `getPermissions` — 권한 트리. 모듈만 체크(permRecord 무시), leaf는 `perms`/`subPerms` 를 children으로 펼침.
