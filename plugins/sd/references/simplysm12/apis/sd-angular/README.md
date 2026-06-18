# @simplysm/sd-angular

Angular(zoneless·signal 기반) 업무 애플리케이션 UI 프레임워크. 부트스트랩/테마/권한 구조, signal 헬퍼, 그리고 sd-* 컨트롤(폼·레이아웃·내비게이션·시각화·시트·오버레이) 전반을 제공.

import 시 `@simplysm/sd-core-browser` 가 자동 로드되어 `Element`/`HTMLElement`/`Blob` 프로토타입 확장(findParent, findFocusableFirst, repaint, download 등)이 활성화됨.

## 사용 트리거 인덱스

- **provideSdAngular / sdHmrBootstrapAsync** — 앱 부트스트랩 설정(테마·전역 에러·command 이벤트·zoneless·SW 업데이트). 아래 인라인 "부트스트랩".
- **directives (sd-events, sd-invalid, sd-ripple, sd-router-link, sd-show-effect, itemOf/typed 템플릿)** — 호스트 요소에 capture/passive/once 이벤트·유효성 표시·물결효과·라우팅·표시애니메이션·타입드 ng-template 부착. 아래 인라인 "디렉티브 / 파이프".
- **FormatPipe** — 문자열/DateOnly/DateTime 포맷팅 파이프. 아래 인라인 "디렉티브 / 파이프".
- **이벤트 플러그인 / command** — `(sdResize)`, `(sdSaveCommand)`, `*.capture/.passive/.once` 등 커스텀 DOM 이벤트. 아래 인라인 "이벤트·command 플러그인".
- **integration providers (SdFileDialog, SdNavigateWindow, SdPrint, SdServiceClientFactory)** — 파일선택·새창내비게이션·인쇄/PDF·서비스 클라이언트 연결. 아래 인라인 "통합 providers".
- **signal 바인딩·래퍼·매니저·setup·transform·injection·라우트 signal** — `$signal`/`$computed`/`$effect`/`$resource`, `$arr`/`$obj`/`$set`/`$map`, Sd*Manager, setup*, injectParent 등 컴포넌트 작성 도구. 자세히: [reactive.md](./reactive.md)
- **앱 구조·권한·공유데이터·시스템설정·테마·스토리지 providers** — 메뉴/권한 트리(SdAppStructureProvider), 서버 공유데이터(SdSharedDataProvider), 설정 저장, 테마 전환. 자세히: [app-providers.md](./app-providers.md)
- **오버레이 (modal·toast·busy·dropdown)** — `SdModalProvider.showAsync`, `SdToastProvider`, `SdBusyProvider`, sd-dropdown. 자세히: [overlay.md](./overlay.md)
- **UI 컨트롤 (폼·레이아웃·내비게이션·시각화)** — sd-button/sd-textfield/sd-select/sd-dock/sd-sidebar/sd-tab/sd-calendar 등 selector·input 목록. 자세히: [ui-controls.md](./ui-controls.md)
- **데이터 시트 (sd-sheet)** — 컬럼 고정/정렬/선택/페이징/트리 그리드. 자세히: [sheet.md](./sheet.md)
- **feature 컨트롤 (data-view·shared-data·permission-table·address·base-container)** — CRUD 화면 추상 기반(AbsSdDataSheet/AbsSdDataDetail), 권한표, 주소검색 모달. 자세히: [features.md](./features.md)

## 부트스트랩

### `provideSdAngular(opt: { clientName: string; defaultTheme: TSdTheme; defaultDark: boolean }): EnvironmentProviders`

루트 `ApplicationConfig.providers` 에 추가하는 환경 프로바이더 묶음.

- **clientName: string** — localStorage 키 프리픽스 및 서비스 클라이언트 식별명.
- **defaultTheme: TSdTheme** — 초기 테마. `"compact" | "mobile" | "kiosk"`. localStorage `sd-theme` 값이 우선.
- **defaultDark: boolean** — 초기 다크모드. localStorage `sd-theme-dark` 값이 우선.
- **동작** — zoneless 변경감지, 전역 ErrorHandler(SdGlobalErrorHandlerPlugin), save/refresh/insert command·resize·option·backbutton 이벤트 플러그인 등록, 라우터 네비게이션 중 전역 busy 표시, ServiceWorker 업데이트 5분 폴링(확인 후 reload), ng-icons 기본 설정(stroke 1.5, size 1.33em).

### `sdHmrBootstrapAsync(rootComponent: Type, options?: ApplicationConfig): Promise<ApplicationRef>`

HMR 지원 부트스트랩. `bootstrapApplication` 래퍼.

- **rootComponent / options** — 루트 컴포넌트 타입과 앱 설정.
- **동작** — Cordova 감지 시 `deviceready` 후 부트스트랩. dev 모드에서 `window.__sd_hmr_destroy` 등록(컴파일 컴포넌트 리셋·destroy). 예외 시 `alert` 후 throw.

### `TXT_CHANGE_IGNORE_CONFIRM: string`

"변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?" 확인 문구 상수. setupCanDeactivate 등 변경 무시 confirm 에 사용.

## 디렉티브 / 파이프

### `SdEventsDirective` — attribute selector (`[click.capture]`, `[sdResize]`, `[sdSaveCommand]` 등)

capture/passive/once 변형 DOM 이벤트와 커스텀 이벤트를 `output` 으로 바인딩. selector 에 나열된 attribute 가 있을 때만 적용.
- 마우스/키보드/포커스/스크롤/휠/터치/드래그 이벤트의 `.capture`·`.passive`·`.once` 변형(예: `(scroll.passive)`, `(click.once)`).
- `(sdResize)` → `ISdResizeEvent { heightChanged; widthChanged; target: Element; contentRect: DOMRectReadOnly }` — 요소 크기 변경 감지(ResizeObserver+IntersectionObserver, rAF 디바운스).
- `(sdRefreshCommand)` / `(sdSaveCommand)` / `(sdInsertCommand)`: KeyboardEvent — 단축키 명령(아래 플러그인 참조).

### `SdInvalidDirective` — `[sd-invalid]`

- **`sd-invalid`(invalidMessage): string (required)** — 비어있지 않으면 호스트 좌상단에 빨간 표시점, form submit 시 `setCustomValidity` 로 검증 실패 처리. 빈 문자열이면 유효.

### `SdRippleDirective` — `[sd-ripple]`

- **`sd-ripple`(enabled): boolean (required, transformBoolean)** — true 일 때 pointerdown 위치에서 물결 애니메이션. 빈 attribute(`sd-ripple`)는 true.

### `SdRouterLinkDirective` — `[sd-router-link]`

- **`sd-router-link`(option)** — `{ link: string; params?; window?: {width?;height?}; outletName?; queryParams? }`. 클릭 시 라우팅. 호스트 cursor=pointer.
- **동작** — window 모드면 새창, Ctrl/Alt 새탭, Shift 새창(기본 800x800), outletName 지정 시 named outlet 라우팅, 그 외 일반 `router.navigate`.

### `SdShowEffectDirective` — `[sd-show-effect]`

- **`sd-show-effect`(enabled): boolean (required, transformBoolean)** — true 면 뷰포트 진입 시 fade+slide 등장 애니메이션.
- **`sd-show-effect-type`(type): "l2r" | "t2b"** (기본 `"t2b"`) — 슬라이드 방향. `t2b` 위→아래, `l2r` 좌→우.

### `SdItemOfTemplateDirective` — `ng-template[itemOf]`

타입 안전 반복 템플릿. context: `{ $implicit; item; index; depth }`. `SdItemOfTemplateContext<TItem>` 타입.
- **`itemOf`: TItem[] (required)** — 항목 배열(타입 추론용).

### `SdTypedTemplateDirective` — `ng-template[typed]`

ng-template context 타입을 명시. `{ typed: T }` 로 context 가 T 임을 보장.

### `FormatPipe` — `| format`

- **transform(value: string | DateTime | DateOnly | undefined, format: string): string** — DateTime/DateOnly 면 `toFormatString(format)`. string 이면 `X` 마스크 포맷(`|` 로 길이별 후보 분기, 예 `"XXX-XXXX|XXX-XXX-XXXX"`). null 이면 빈 문자열.

## 이벤트·command 플러그인

`provideSdAngular` 가 자동 등록. 직접 export 되며 EventManagerPlugin 구현.

- **SdSaveCommandEventPlugin** — `(sdSaveCommand)`: Ctrl+S. 모달이 열려있으면 이벤트 발생 요소와 같은 sd-modal 안일 때만 핸들.
- **SdRefreshCommandEventPlugin** — `(sdRefreshCommand)`: Ctrl+Alt+L. 동일한 모달 스코프 규칙.
- **SdInsertCommandEventPlugin** — `(sdInsertCommand)`: Ctrl+Insert. 동일한 모달 스코프 규칙.
- **SdResizeEventPlugin** — `(sdResize)`: 위 ISdResizeEvent. ResizeObserver/IntersectionObserver 기반.
- **SdOptionEventPlugin** — `*.capture` / `*.passive` / `*.once` 접미사가 붙은 표준 DOM 이벤트를 해당 옵션으로 addEventListener.
- **SdIntersectionEventPlugin** — `(sdIntersection)`: `ISdIntersectionEvent { entry: IntersectionObserverEntry }`. (자동 등록 아님, 직접 사용 시 provider 추가 필요)
- **SdBackbuttonEventPlugin** (`@deprecated`) — `(sdBackbutton)`: Alt+← 또는 Capacitor/Cordova backButton.
- **SdGlobalErrorHandlerPlugin** — ErrorHandler 구현. unhandledrejection/error/Error 를 SdSystemLogProvider 에 기록 후 appRef destroy, 전체화면 오버레이로 메시지 표시(클릭 시 reload).

## 통합 providers

### `SdFileDialogProvider` (root)
- **showAsync(multiple?: false, accept?: string): Promise<File | undefined>** / **showAsync(multiple: true, accept?): Promise<File[] | undefined>** — 숨김 input[type=file] 로 파일 선택. accept 는 MIME 필터. 취소 시 1초 후 undefined.

### `SdNavigateWindowProvider` (root)
- **get isWindow: boolean** — 현재 URL hash 쿼리에 `window=true` 면 별도 창 모드.
- **open(navigate: string, params?, features?): void** — 해시 라우트로 새 창/탭 열기. window 모드이거나 features 가 `_blank` 아니면 `window.open(features)`, 그 외 새 탭.

### `SdPrintProvider` (root)
- **printAsync<T extends ISdPrint>(template: ISdPrintInput<T>, options?: { size?: string; margin?: string }): Promise<void>** — 컴포넌트를 일시 렌더 후 `window.print()`. `@page` size 기본 `"A4 auto"`, margin 기본 `"0"`. 인쇄 중 전역 busy. 컴포넌트는 `initialized: Signal<boolean>` 필요.
- **getPdfBufferAsync<T>(template, options?: { orientation?: "portrait" | "landscape" }): Promise<Buffer>** — `.page` 요소(없으면 루트)를 html-to-image+jsPDF 로 A4 PDF 버퍼 생성. 기본 portrait.
- **ISdPrintInput<T, X>** — `{ type: Type<T>; inputs: Omit<TDirectiveInputSignals<T>, X> }`. ISdPrint = `{ initialized: Signal<boolean> }`.

### `SdServiceClientFactoryProvider` (root)
- **connectAsync(key: string, options?: Partial<ISdServiceConnectionConfig>): Promise<void>** — 키별 SdServiceClient 연결(기본 현재 location host/port/ssl, useReconnect). 중복 키는 에러. reload 이벤트(css만이면 link 교체, 아니면 HMR 또는 reload), 요청/응답 진행률 토스트 자동.
- **get(key): SdServiceClient** — 연결된 클라이언트 반환(미연결 키는 에러). **closeAsync(key)** — 종료·제거. provider destroy 시 전체 close.
