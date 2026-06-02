# @simplysm/angular — 호스트 디렉티브·동작 셋업

엘리먼트에 부착하는 동작 디렉티브와, 컴포넌트 생성자에서 호출해 호스트 엘리먼트에 동작을 주입하는 `setup*` 함수, 타입 안전 템플릿 디렉티브. 다른 컴포넌트들이 ripple/검증/리사이즈 감지 등에 내부적으로 사용하며 단독으로도 쓸 수 있음.

## 이벤트 옵저버 디렉티브

- `[sdResize]` (`SdResizeDirective`) — `ResizeObserver` 로 크기 변화 감지. `sdResize = output<SdResizeEvent>()`. `SdResizeEvent = { heightChanged; widthChanged; target: HTMLElement; contentRect: DOMRectReadOnly }`. requestAnimationFrame 디바운스.
- `[sdIntersection]` (`SdIntersectionDirective`) — `IntersectionObserver` 로 가시성 감지. `sdIntersection = output<SdIntersectionEvent>()`. `SdIntersectionEvent = { entry: IntersectionObserverEntry }`.

## SdEvents

`SdEvents` 디렉티브 — capture/passive/once 옵션 이벤트를 output 으로 노출(Angular 기본 바인딩이 지원 않는 리스너 옵션용). 셀렉터에 해당하는 속성을 호스트에 쓰면 동작. 예: `(click.capture)`, `(scroll.passive)`, `(wheel.capture.passive)`, `(touchstart.passive)`, `(transitionend.once)` 등. 각 output 은 대응 DOM 이벤트 타입(MouseEvent/WheelEvent/TouchEvent 등) emit.

`SdOptionEventPlugin` — `provideSdAngular` 가 등록하는 `EventManagerPlugin`. `.capture`/`.passive`/`.once` 접미사 이벤트 바인딩을 실제 리스너 옵션으로 변환. 직접 사용 불필요.

## SdCommandDirective

`[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]` — 전역 단축키를 명령 이벤트로 변환(최상위 모달 컨텍스트에서만 발동).

- `sdRefreshCommand = output<KeyboardEvent>()` — Ctrl+Alt+L.
- `sdSaveCommand = output<KeyboardEvent>()` — Ctrl+S.
- `sdInsertCommand = output<KeyboardEvent>()` — Ctrl+Insert.

CRUD 컨테이너가 `sdSaveCommand` 를 저장에 연결.

## ripple / show-effect / invalid 디렉티브·셋업

부착형 디렉티브와 동치 셋업 함수 쌍.

- `[sdRipple]` (`SdRipple`) — 클릭 ripple 효과. `sdRipple = input.required(booleanAttribute)`(활성 여부). `setupRipple(enableFn?: () => boolean)` 는 컴포넌트 생성자에서 호스트에 ripple 주입(버튼/체크박스가 사용).
- `[sdShowEffect]` (`SdShowEffect`) — 스크롤 진입 시 페이드/슬라이드 인. `sdShowEffect = input.required(booleanAttribute)`(활성), `sdShowEffectType: "l2r"|"t2b"`(슬라이드 방향, 기본 `"t2b"`). `setupRevealOnShow(optFn?)` 가 동치 셋업.
- `[sdInvalid]` (`SdInvalid`) — 임의 엘리먼트에 폼 검증 메시지 부착. `sdInvalid = input.required<string>()`(메시지, 빈 문자열이면 유효). `setupInvalid(getInvalidMessage: () => string)` 가 동치 셋업(숨김 input + `setCustomValidity` 로 네이티브 검증 연동, `<sd-form>` 제출 시 표시). 모든 `required` 컨트롤이 내부 사용.

## setupModelHook

`setupModelHook<T, S extends WritableSignal<T>>(model: S, canFn: Signal<(item: T) => boolean | Promise<boolean>>): void` — `model` 의 set/update 를 가로채 `canFn` 통과 시에만 값 적용. 체크박스/스위치/공유선택리스트의 `canChangeFn` 구현.

- `model` — 가로챌 WritableSignal.
- `canFn` — 변경 허용 판정 시그널. `false` 반환 시 무시, `true` 면 즉시 set, Promise 면 resolve 가 `false` 아닐 때 set(에러는 ErrorHandler 위임).

## 타입 안전 템플릿 디렉티브

- `ng-template[typed]` (`SdTypedTemplate<T>`) — `typed = input.required<T>()` 로 템플릿 컨텍스트 타입을 명시(재귀 메뉴 등 `let-x` 타입 추론용). 값은 타입 토큰일 뿐.
- `ng-template[itemOf]` (`SdItemOfTemplate<TItem>`) — `itemOf = input.required<TItem[]>()` 로 항목 반복 템플릿의 컨텍스트 타입 제공. select/calendar/공유선택이 항목 슬롯에 사용. 컨텍스트 `SdItemOfTemplateContext<TItem> = { $implicit; item; index; depth }`.
