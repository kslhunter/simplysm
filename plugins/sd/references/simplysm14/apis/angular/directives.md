# @simplysm/angular — 디렉티브·signal 헬퍼

DOM 관찰(리사이즈/교차)·캡처 이벤트·커맨드 단축키·ripple·노출 애니메이션·invalid 표시·타입드 템플릿을 호스트 엘리먼트에 붙이는 디렉티브와, 그 디렉티브가 래핑하는 `setup*` 헬퍼 군. `setup*`/`inject*` 헬퍼는 컴포넌트 `constructor`(주입 컨텍스트)에서 호출(`inject(ElementRef)` 등 의존). 모든 디렉티브는 standalone, attribute selector.

## DOM 관찰 디렉티브

### `SdResizeDirective` — `[sdResize]`

- `sdResize: output<SdResizeEvent>` — `ResizeObserver` 기반, `requestAnimationFrame` 디바운스. `SdResizeEvent` = `{ heightChanged: boolean; widthChanged: boolean; target: HTMLElement; contentRect: DOMRectReadOnly }`.

```html
<div (sdResize)="onResize($event)">...</div>
```

### `SdIntersectionDirective` — `[sdIntersection]`

- `sdIntersection: output<SdIntersectionEvent>` — `IntersectionObserver` 기반, 콜백 배치의 마지막 엔트리 emit. `SdIntersectionEvent` = `{ entry: IntersectionObserverEntry }`.

## 캡처/옵션 이벤트

### `SdEvents` (디렉티브)

native DOM 리스너 옵션(`capture`/`passive`/`once`)을 이벤트명 접미사로 노출하는 디렉티브. `SdOptionEventPlugin` 과 함께 동작. 출력은 접미사 그대로의 이름: `click.capture`/`click.once`/`click.capture.once`, `mousedown.capture`/`mouseup.capture`/`mouseover.capture`/`mouseout.capture`, `keydown.capture`/`keyup.capture`, `focus.capture`/`blur.capture`, `invalid.capture`, `scroll.capture`/`scroll.passive`/`scroll.capture.passive`, `wheel.passive`/`wheel.capture.passive`, `touchstart.passive`/`touchmove.passive`/`touchend.passive`(및 `.capture.passive` 변형), `dragover.capture`/`dragenter.capture`/`dragleave.capture`/`drop.capture`, `transitionend.once`, `animationend.once`. 각 출력의 페이로드 타입은 해당 native 이벤트(`MouseEvent`/`KeyboardEvent`/`FocusEvent`/`DragEvent`/`WheelEvent`/`TouchEvent`/`TransitionEvent`/`AnimationEvent`/`Event`).

```html
<div (keydown.capture)="onKeydownCapture($event)" (scroll.passive)="onScroll($event)">...</div>
```

### `SdOptionEventPlugin`

`EventManagerPlugin` 확장(`provideSdAngular` 가 `EVENT_MANAGER_PLUGINS` multi 로 등록). 이벤트명 접미사 `.capture`/`.passive`/`.once` 를 native 리스너 옵션으로 변환. 위 `SdEvents` 출력이 이 플러그인 위에서 동작.

## 커맨드 단축키

### `SdCommandDirective` — `[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]`

전역 키 조합을 받아 출력으로 발화하는 디렉티브. 호스트가 최상위 열린 모달 안이거나 모달이 없을 때만 처리.

- `sdRefreshCommand: output<KeyboardEvent>` — `Ctrl+Alt+L`.
- `sdSaveCommand: output<KeyboardEvent>` — `Ctrl+S`(Alt 없이). `sd-crud-list`/`sd-crud-detail` 이 hostDirective 로 사용해 저장에 배선.
- `sdInsertCommand: output<KeyboardEvent>` — `Ctrl+Insert`.

## ripple

### `setupRipple`

```ts
function setupRipple(enableFn?: () => boolean): void
```

- 주입 컨텍스트에서 호출. 호스트를 `position:relative; overflow:hidden` 으로 만들고 `pointerdown` 시 확장 원형 ripple 생성. `enableFn` 이 false 반환 시 스킵. SSR no-op.

### `SdRipple` — `[sdRipple]`

- `enabled: input.required({ alias: "sdRipple", transform: booleanAttribute })` — 속성값을 boolean 으로. `setupRipple(() => enabled())` 배선.

## 노출 애니메이션

### `setupRevealOnShow`

```ts
function setupRevealOnShow(optFn?: () => { type?: "l2r" | "t2b"; enabled?: boolean }): void
```

- 초기 숨김(opacity 0 + 이동) 후 `IntersectionObserver` 로 화면 진입 시 슬라이드-인. `type` = `"l2r"`(좌→우) / `"t2b"`(위→아래, 기본). `enabled` 기본 true(false 면 즉시 표시).

### `SdShowEffect` — `[sdShowEffect]`

- `enabled: input.required({ alias: "sdShowEffect", transform: booleanAttribute })`.
- `sdShowEffectType: input<"l2r" | "t2b">("t2b")` — 노출 방향.

## invalid 표시

### `setupInvalid`

```ts
function setupInvalid(getInvalidMessage: () => string): void
```

- 호스트에 danger 인디케이터 점 + 숨김 input(native validity 운반)을 주입. `getInvalidMessage()` 가 빈 문자열이 아니면 invalid(점 표시·`setCustomValidity`). `sd-form` 의 `checkValidity()` 에 연동. 모든 검증 컨트롤(`sd-textfield` 등)의 내부 기반.

### `SdInvalid` — `[sdInvalid]`

- `invalidMessage: input.required<string>({ alias: "sdInvalid" })` — 비어있지 않으면 호스트를 invalid 표시.

## 타입드 템플릿

### `SdTypedTemplate<T>` — `ng-template[typed]`

- `typed: input.required<T>()` — 템플릿 컨텍스트 타입을 정하는 값. 정적 `ngTemplateContextGuard` 로 컨텍스트를 `T` 로 좁힘.

### `SdItemOfTemplate<TItem>` — `ng-template[itemOf]`

- `itemOf: input.required<TItem[]>()` — 항목 배열; 원소 타입으로 per-item 컨텍스트를 정함. 공유데이터 select·calendar 등 항목 렌더 템플릿에 사용.
- `SdItemOfTemplateContext<TItem>` = `{ $implicit: TItem; item: TItem; index: number; depth: number }`. 템플릿에서 `let-item="item"` 등으로 받음.

```html
<sd-shared-data-select [items]="sharedCustomers.items()" ...>
  <ng-template [itemOf]="sharedCustomers.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select>
```

## 전역 에러 핸들러

### `SdGlobalErrorHandlerPlugin`

Angular `ErrorHandler` 구현(`provideSdAngular` 가 `ErrorHandler` 로 등록). `handleError(event)` — 브라우저에서 에러를 분류해 1회 전체화면 오버레이 표시 + `SdSystemLogProvider` 적재 + 앱 파괴(클릭 시 새로고침). SSR 에선 로깅만. 직접 호출할 일은 없고 등록만.
