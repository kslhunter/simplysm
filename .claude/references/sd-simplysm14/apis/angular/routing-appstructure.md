# @simplysm/angular — 라우팅 / 앱 구조(메뉴·권한)

현재 페이지 식별·뷰 제목/타입 판정, 라우터 링크, 앱 메뉴/권한 트리 구성을 다룰 때 함께 읽힘. 앱 구조 데이터 원본은 `@simplysm/service-common` 의 `AppStructureItem`.

## injectFullPageCodeSignal

`injectFullPageCodeSignal(): Signal<string>` — 현재 라우터 URL 에서 앞 2 세그먼트(`/home` 등)를 제외한 나머지를 `.` 으로 이은 페이지 코드. 네비게이션 종료마다 갱신. 메뉴 선택 표시·뷰 제목 조회에 사용.

## injectCurrentPageCodeSignal

`injectCurrentPageCodeSignal(): Signal<string> | undefined` — 현재 `ActivatedRoute` 의 pathFromRoot 기준 코드(중첩 outlet/모달 안에서 자기 자신 경로). ActivatedRoute 없으면 undefined. fullPageCode 와 비교해 page/control 판정에 사용.

## injectViewTitleSignal

`injectViewTitleSignal(): Signal<string>` — 모달 안이면 모달 제목, 아니면 앱 구조에서 현재 페이지 코드로 찾은 제목(`[상위 > 상위] 현재`). 못 찾으면 `""`. 화면 컨테이너 제목 표시에 사용.

## injectViewTypeSignal

`injectViewTypeSignal(): Signal<SdViewType>` — 현재 컴포넌트가 어떤 맥락으로 떠 있는지 판정. `SdViewType = "page"|"modal"|"control"`. 모달 안이면 "page"가 아닌 "modal", 라우트의 페이지 컴포넌트로 직접 떠 있고 fullPageCode===currPageCode 면 "page", 그 외 "control"(다른 화면에 박힌 재사용 컴포넌트). CRUD 컨테이너의 `viewType` input 에 그대로 전달.

## setupCanDeactivate

`setupCanDeactivate(fn: () => boolean): void` — 컴포넌트 내 호출. 모달 안이면 `SdActivatedModalProvider.canDeactivateFn` 에, 라우트면 해당 route 의 `canDeactivate` 가드에 fn 을 등록(컴포넌트 파괴 시 해제). fn 이 false 면 이탈/닫기 차단. 미저장 변경 보호에 사용.

```ts
setupCanDeactivate(() => !this.dirty() || confirm("저장하지 않고 나갈까요?"));
```

## SdRouterLink

`[sdRouterLink]="option"` 디렉티브. 클릭 시 option 으로 라우터 이동(또는 새 창).
- option: `{ link: string; params?; window?: {width?;height?}; outletName?: string; queryParams? } | undefined` — undefined 면 동작 없음(커서도 기본). 현재가 window 모드거나 Ctrl/Shift+클릭이면 새 창으로, outletName 있으면 named outlet 으로 이동. Alt+클릭은 무시.

## SdNavigateWindowProvider

`@Injectable({providedIn:"root"})`. 새 창/팝업 네비게이션.
- isWindow: boolean — 현재 URL 해시에 `window=true` 가 있는지(팝업으로 열린 창인지).
- open(navigate: string, params?, features?): void — window 모드거나 features 지정 시 `window.open` 팝업(닫힐 때 부모와 함께 정리), 아니면 `_blank` 탭.

## getMenuRouterLinkOption / getIsMenuSelected

- `getMenuRouterLinkOption(menu: SdMenu): { link; queryParams } | undefined` — leaf 메뉴(children/url 없음)면 `/home/<코드체인>` 링크 + 쿼리파라미터 옵션, 그 외 undefined. `SdRouterLink` 에 바로 전달.
- `getIsMenuSelected(menu, fullPageCode, customFn?): boolean` — customFn 있으면 그 결과, 없으면 `fullPageCode === menu.codeChain.join(".")`. 메뉴 선택 강조에 사용.

## SdAppStructureProvider<TModule>

`@Injectable({providedIn:"root"})`. 앱 메뉴·권한 트리의 단일 소스.
- usableModules: Signal<TModule[]|undefined> — 활성 모듈 목록. 메뉴/권한 필터에 사용(미설정 시 전체 허용 취급).
- permRecord: Signal<Record<string,boolean>|undefined> — `<코드>.<권한키>` → 허용 여부 맵.
- items: Signal<AppStructureItem<TModule>[]> — 구조 원본.
- initialize(items) — 구조 주입.
- usableMenus: Signal<SdMenu[]> — 모듈·권한 통과한 메뉴 트리(사이드바/탑바용).
- usableFlatMenus: Signal<SdFlatMenu<TModule>[]> — 평탄화된 메뉴 목록.
- getPermissionsByStructure(items, codeChain?) — 권한 편집표용 `SdPermission` 트리 생성.
- getTitleByFullCode(fullCode) / findTitleByFullCode(fullCode) — 전자는 못 찾으면 throw, 후자는 undefined(결측 보존).
- getItemChainByFullCode(fullCode) — 코드 체인에 해당하는 항목 배열(없으면 빈 배열).
- getPermsByFullCode(fullCodes, permKeys) — 해당 코드들에서 보유한 권한 키 목록.

`injectPermsSignal<K>(viewCodes: string[], keys: K[]): Signal<K[]>` — 현재 보유 권한 키를 computed signal 로. 화면에서 편집/사용 권한 분기에 사용.

## SdAppStructureUtils

`abstract class`. `SdAppStructureProvider` 가 내부 사용하는 정적 유틸 모음(직접 호출 가능): `getMenus`/`getFlatMenus`/`getPermissions`/`getFlatPermissions`/`getTitleByFullCode`/`findTitleByFullCode`/`getItemChainByFullCode`/`getPermsByFullCode`. 시그니처는 provider 메서드와 대응(추가로 items/usableModules/permRecord 를 인자로 받음).

## 타입

- **SdMenu** — `{ title; codeChain: string[]; url?; icon?; children?: SdMenu[] }`. 메뉴 트리 노드.
- **SdFlatMenu<TModule>** — `{ titleChain: string[]; codeChain: string[]; modulesChain: TModule[][] }`. 평탄 메뉴.
- **SdPermission<TModule>** — `{ title; codeChain; modules; perms: ("use"|"edit")[]|undefined; children }`. 권한 트리 노드(권한표 입력).
