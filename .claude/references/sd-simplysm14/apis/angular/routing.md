# @simplysm/angular — routing

Angular Router 위에 페이지 코드(`a.b.c` 점 표기)·뷰 타입·새창 네비게이션 헬퍼.

## SdRouterLink — `[sdRouterLink]` (Directive)

```ts
option = input<{
  link: string;
  params?: Record<string, string>;
  window?: { width?: number; height?: number };  // 새창 띄울 때 크기
  outletName?: string;
  queryParams?: Record<string, string>;
} | undefined>(undefined, { alias: "sdRouterLink" });
```

- click 처리. `Alt+click` 무시(브라우저 기본 다운로드 거동 보존). 새창 모드(`SdNavigateWindowProvider.isWindow=true` 또는 `Ctrl/Shift+click`)면 `window.open` 으로 새창 띄움. 일반 모드면 `Router.navigate`.
- `link` — 라우터 경로. `window` 옵션 지정 시 width/height (기본 800x800) 으로 새창.
- `outletName` — 보조 outlet 라우팅용. 미지정 시 primary.
- `params`/`queryParams` — 라우터 매트릭스 파라미터/쿼리 파라미터.

```html
<sd-anchor [sdRouterLink]="{ link: '/home/sales/invoice', params: { id: '1' } }">송장</sd-anchor>
```

## SdNavigateWindowProvider (root)

```ts
get isWindow: boolean;        // 현재 URL hash 의 ;window=true 여부
open(navigate: string, params?: Record<string, string>, features?: string): void;
```

- 현재 창이 simplysm 새창 모드인지 판단(`location.hash` 의 `;window=true`).
- `open` — 새창이거나 `features` 가 주어지면 `window.open(... features)`. 일반 모드면 `_blank` 탭. 부모창 close 시 자식들도 일괄 종료.

## injectCurrentPageCodeSignal

```ts
function injectCurrentPageCodeSignal(): Signal<string> | undefined
```

- `ActivatedRoute.pathFromRoot.slice(2)` 의 url segments 를 `.` 으로 join. 라우터 컨텍스트 없으면 undefined.
- 예: `/home/sales/invoice` → `"sales.invoice"`.

## injectFullPageCodeSignal

```ts
function injectFullPageCodeSignal(): Signal<string>
```

- `Router.events` 의 NavigationEnd → URL → segment 2개부터 `.` join. matrix/query 제거.
- "전체 페이지 코드" 로 메뉴 선택 상태 판정에 사용.

## injectViewTitleSignal

```ts
function injectViewTitleSignal(): Signal<string>
```

- 모달 안이면 `SdActivatedModalProvider.modalComponent().title()`.
- 그 외엔 `SdAppStructureProvider.getTitleByFullCode(currentPageCode ?? fullPageCode)`.
- 페이지/모달 상단에 표시할 제목.

## injectViewTypeSignal

```ts
function injectViewTypeSignal(): Signal<SdViewType>;
type SdViewType = "page" | "modal" | "control";
```

- `page`: 라우터 진입 페이지 컴포넌트, `modal`: 모달 컨텐츠, `control`: 그 외(다른 컴포넌트의 자식). 컴포넌트가 자기 컨텍스트별로 다르게 그릴 때.

## setupCanDeactivate

```ts
function setupCanDeactivate(fn: () => boolean): void
```

- 모달 안: `SdActivatedModalProvider.canDeactivateFn = fn` 으로 ESC/배경/닫기 차단.
- 라우터 페이지: route config 에 `CanDeactivate` 가드 추가(컴포넌트 파괴 시 자동 제거).
- 저장 안된 변경 사항 보호용.

```ts
setupCanDeactivate(() => !isDirty() || confirm("변경 사항이 있습니다. 나가시겠습니까?"));
```

## getMenuRouterLinkOption

```ts
function getMenuRouterLinkOption(menu: SdMenu): { link: string; queryParams: Record<string, string>|undefined } | undefined
```

- leaf 메뉴(`children` 도 `url` 도 없음)만 결과 반환. 그룹/외부URL 메뉴는 undefined.
- 반환 link 는 `/home/<codeChain join "/">`. 마지막 segment 에 `?key=val` 포함 시 분리해 queryParams 로.

## getIsMenuSelected

```ts
function getIsMenuSelected(menu: SdMenu, fullPageCode: string|undefined, customFn?: (menu) => boolean): boolean
```

- 커스텀 함수 있으면 그것 사용. 없으면 `fullPageCode === menu.codeChain.join(".")`.

## 주의

- 페이지 코드는 `/home/` 다음의 segment 들 `.` join. 라우터를 이 컨벤션에 맞춰 설계해야 메뉴 선택 표시·뷰 타이틀 자동 동작.
- `SdRouterLink` 의 `link` 는 라우터 절대경로 또는 상대경로. `link` 에 `?queryString` 직접 쓰지 말고 `queryParams` 객체로 분리.
