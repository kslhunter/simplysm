# @simplysm/angular — routing

Angular Router 위에 페이지 코드(`a.b.c` 형식)·뷰 타입·새창 네비게이션을 얹는 헬퍼.

## `SdRouterLink` 디렉티브

```html
<a [sdRouterLink]="{ link: '/home/order/list', params: { id }, queryParams, outletName, window: { width, height } }">go</a>
```

- 일반 클릭 → `router.navigate`. Ctrl/Shift 클릭 또는 새창 모드(`isWindow`)일 때 → `SdNavigateWindowProvider.open` 으로 새 창. Alt+click 무시.
- `outletName` 지정 시 named outlet 으로 navigate.

## `SdNavigateWindowProvider`

```typescript
const nav = inject(SdNavigateWindowProvider);
nav.open("/home/order/list", { id }, "width=800,height=600");
nav.isWindow; // 현재 컨텍스트가 팝업 윈도우인지
```

URL hash 끝에 `;window=true` 가 있으면 `isWindow=true`. 부모 unload 시 자기가 연 창 자동 close.

## Page Code Signal

페이지 코드 = activated route URL segment 를 `.` 으로 join.

- `injectCurrentPageCodeSignal()`: 현재 라우트의 segment 신호 (`undefined` if no ActivatedRoute).
- `injectFullPageCodeSignal()`: router.url 기반 풀 코드.
- `injectViewTitleSignal()`: 모달이면 `modalComponent.title()`, 아니면 `SdAppStructureProvider.getTitleByFullCode`.
- `injectViewTypeSignal(): Signal<SdViewType>`. `SdViewType = "page" | "modal" | "control"`. 모달 컨텍스트면 `"modal"`, page-level route component면 `"page"`, 그 외 `"control"`.

## `setupCanDeactivate(fn: () => boolean)`

constructor 내 호출. 모달 컨텍스트면 `SdActivatedModalProvider.canDeactivateFn` 설정, 라우트 컨텍스트면 `route.routeConfig.canDeactivate` 에 push (destroy 시 제거).

## 메뉴 유틸

- `getMenuRouterLinkOption(menu: SdMenu)`: leaf 메뉴를 `SdRouterLink` 옵션(`{ link, queryParams }`)으로 변환. children/url 있으면 `undefined`.
- `getIsMenuSelected(menu, fullPageCode, customFn?)`: 현재 페이지가 메뉴와 일치하는지.

## 주의

- 페이지 코드는 hash router 기준 `/home/<code>` 구조 가정.
- `injectCurrentPageCodeSignal` 은 `pathFromRoot.slice(2)` 사용 — root + `home` 두 레벨 위 라우트 컴포넌트에서 의미 있음.
