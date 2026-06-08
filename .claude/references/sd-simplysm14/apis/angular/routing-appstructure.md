# @simplysm/angular — 라우팅·메뉴·권한(app-structure)

라우터 링크·현재 페이지 식별·뷰 컨텍스트(page/control/modal)·이탈 가드, 그리고 앱 구조 트리에서 메뉴·권한을 파생하는 군. 화면 컴포넌트의 표준 시그널 `viewType`, 권한 가드 `injectPermsSignal`, 사이드바/탑바 메뉴가 이 군에 의존.

## 라우팅 디렉티브·프로바이더

### SdRouterLink — `[sdRouterLink]`

```ts
option = input<{ link: string; params?: Record<string,string>;
  window?: { width?: number; height?: number };
  outletName?: string; queryParams?: Record<string,string> } | undefined>(undefined, { alias: "sdRouterLink" });
```

- 클릭 시 라우터 내비게이트. `option.link`=경로, `params`=matrix 파라미터, `queryParams`=쿼리, `outletName`=명명 outlet. Ctrl/Shift 클릭 또는 윈도우 모드면 새 창으로(`window.width/height`). Alt 클릭은 무시.

```html
<sd-list-item [sdRouterLink]="{ link: '/home/order/list' }">주문</sd-list-item>
```

### SdNavigateWindowProvider

```ts
@Injectable({ providedIn: "root" }) class SdNavigateWindowProvider {
  get isWindow: boolean;
  open(navigate: string, params?: Record<string,string>, features?: string): void;
}
```

- `isWindow` — 현재가 팝업 창 모드인지(hash 의 `window=true`). `open(navigate, params, features)` — 새 창/탭으로 화면을 염(features 있으면 팝업, 없으면 새 탭). 부모 종료 시 자식 창 일괄 닫힘.

## 페이지 식별·뷰 컨텍스트 시그널

주입 컨텍스트(컴포넌트 생성자)에서 호출하는 헬퍼.

### injectFullPageCodeSignal / injectCurrentPageCodeSignal

```ts
injectFullPageCodeSignal(): Signal<string>;
injectCurrentPageCodeSignal(): Signal<string> | undefined;
```

- `injectFullPageCodeSignal` — 현재 URL 의 전체 페이지 코드(`a.b.c`, `/home/` 이후 세그먼트를 `.` 결합). 메뉴 선택 판정에 사용.
- `injectCurrentPageCodeSignal` — 현재 라우트 컴포넌트 기준 페이지 코드(중첩 라우트의 자기 위치). `ActivatedRoute` 없으면 undefined.

### injectViewTitleSignal / injectViewTypeSignal

```ts
injectViewTitleSignal(): Signal<string>;
injectViewTypeSignal(): Signal<SdViewType>; // "page" | "modal" | "control"
```

- `injectViewTitleSignal` — 현재 뷰 제목. 모달이면 모달 title, 페이지면 app-structure 에서 코드로 제목 조회. `sd-base-container` 가 사용.
- `injectViewTypeSignal` — 현재 뷰 컨텍스트. `"modal"`=모달 안, `"page"`=라우팅 진입 단위(컴포넌트 selector 가 라우트 컴포넌트와 일치+풀코드 매칭), 그 외 `"control"`(임베드). crud 골격의 `viewType` 입력에 그대로 전달.

### setupCanDeactivate

```ts
setupCanDeactivate(fn: () => boolean): void;
```

- 화면 이탈 가드 등록. 모달 안이면 `SdActivatedModalProvider.canDeactivateFn` 에, 페이지면 라우트 `canDeactivate` 에 연결(파괴 시 해제). `fn` 이 false 면 이탈 차단(미저장 변경 보호).

### 메뉴 유틸

```ts
getMenuRouterLinkOption(menu: SdMenu): { link: string; queryParams: Record<string,string>|undefined } | undefined;
getIsMenuSelected(menu: SdMenu, fullPageCode: string|undefined, customFn?: (menu: SdMenu)=>boolean): boolean;
```

- `getMenuRouterLinkOption` — 리프 메뉴(자식·url 없음)면 `/home/<codeChain>` 링크 옵션 반환, 그룹/외부url 이면 undefined(클릭 비내비게이트). `sdRouterLink` 에 전달.
- `getIsMenuSelected` — 메뉴가 현재 페이지인지. `customFn` 있으면 그 결과, 없으면 코드 일치. 메뉴 컴포넌트가 선택 강조에 사용.

## 앱 구조(메뉴·권한)

### SdAppStructureProvider

```ts
@Injectable({ providedIn: "root" }) class SdAppStructureProvider<TModule = unknown> {
  usableModules: WritableSignal<TModule[] | undefined>;
  permRecord: WritableSignal<Record<string, boolean> | undefined>;
  items: WritableSignal<AppStructureItem<TModule>[]>;
  initialize(items): void;
  usableMenus = computed<SdMenu[]>(...);
  usableFlatMenus = computed<SdFlatMenu<TModule>[]>(...);
  getPermissionsByStructure(items, codeChain?): SdPermission<TModule>[];
  getTitleByFullCode(fullCode): string;     // 못 찾으면 throw
  findTitleByFullCode(fullCode): string | undefined; // 결측 보존
  getItemChainByFullCode(fullCode): AppStructureItem<TModule>[];
  getPermsByFullCode<K>(fullCodes: string[], permKeys: K[]): K[];
}
```

- `initialize(items)` — 앱 구조 트리 주입. `usableModules`/`permRecord` 를 인증 후 채우면 메뉴/권한이 그에 맞게 필터됨.
- `usableMenus` — 모듈·권한으로 필터된 메뉴 트리(사이드바/탑바용). `usableFlatMenus` — 평탄화된 메뉴(검색 등).
- `getTitleByFullCode` 는 못 찾으면 throw, `findTitleByFullCode` 는 undefined(결측 보존) — 상황에 맞게 선택. `getPermsByFullCode` 는 주어진 코드들에 대해 보유한 권한 키만 반환.

### injectPermsSignal

```ts
injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>;
```

- 화면 권한 가드. `viewCodes`(보통 현재 화면 코드)에 대해 `keys`(`["use","edit"]` 등) 중 보유한 것만 반환하는 시그널. `perms().includes("use")` 로 분기.

```ts
perms = injectPermsSignal(["base.role"], ["use", "edit"]);
```

### SdAppStructureUtils

```ts
abstract class SdAppStructureUtils {
  static getTitleByFullCode(items, fullCode): string;
  static findTitleByFullCode(items, fullCode): string | undefined;
  static getPermsByFullCode(items, fullCodes, permKeys, permRecord): K[];
  static getItemChainByFullCode(items, fullCode): AppStructureItem[];
  static getMenus(items, codeChain, usableModules, permRecord): SdMenu[];
  static getFlatMenus(items, usableModules, permRecord): SdFlatMenu[];
  static getPermissions(items, codeChain, usableModules): SdPermission[];
  static getFlatPermissions(items, usableModules);
}
```

- 트리에서 메뉴/권한/제목/체인을 계산하는 순수 정적 유틸(`SdAppStructureProvider` 가 위임). provider 없이 트리만으로 파생할 때 직접 호출.

### 타입

```ts
SdMenu { title: string; codeChain: string[]; url?: string; icon?: string; children?: SdMenu[] }
SdFlatMenu<TModule> { titleChain: string[]; codeChain: string[]; modulesChain: TModule[][] }
SdPermission<TModule> { title; codeChain; modules?; perms?: ("use"|"edit")[]; children? }
SdViewType = "page" | "modal" | "control"
```

- `SdMenu` — 메뉴 트리 노드(레이아웃 메뉴 컴포넌트 입력). `SdFlatMenu` — 평탄화 메뉴. `SdPermission` — 권한 트리 노드(`SdPermissionTable` 입력, features.md). `SdViewType` — crud/뷰 컨텍스트.
