# @simplysm/angular — 호스트 디렉티브·signal 헬퍼

DOM 관찰(리사이즈/교차)·캡처 이벤트·커맨드 단축키·ripple·노출 애니메이션·invalid 표시·타입드 템플릿을 호스트 엘리먼트에 붙이는 디렉티브와, signal/model 을 다루는 작은 헬퍼 군. `setup*` 헬퍼는 컴포넌트 `constructor`(주입 컨텍스트)에서 호출(`inject(ElementRef)` 의존), `Sd*` 디렉티브는 그 헬퍼를 attribute 로 래핑.

## DOM 관찰 디렉티브

### SdResizeDirective — `[sdResize]`

```ts
sdResize = output<SdResizeEvent>();
// SdResizeEvent { heightChanged: boolean; widthChanged: boolean; target: HTMLElement; contentRect: DOMRectReadOnly }
```

- `ResizeObserver` 로 크기 변화를 rAF 디바운스해 방출. `heightChanged`/`widthChanged` 로 변경 축을 구분(불필요한 재계산 회피). 시트·collapse·echarts 가 사용.

```html
<div (sdResize)="onResize($event)">...</div>
```

### SdIntersectionDirective — `[sdIntersection]`

```ts
sdIntersection = output<SdIntersectionEvent>();
// SdIntersectionEvent { entry: IntersectionObserverEntry }
```

- `IntersectionObserver` 로 뷰포트 진입/이탈을 방출. 지연 로드·노출 트리거에 사용. `entry.isIntersecting` 으로 판정.

## 이벤트·커맨드 디렉티브

### SdEvents — 이벤트 수식어 출력

```ts
// selector 의 각 어트리뷰트가 output. 예:
"click.capture", "click.once", "scroll.passive", "wheel.passive",
"touchstart.passive", "keydown.capture", "focus.capture", "blur.capture",
"invalid.capture", "transitionend.once", "animationend.once" ...
```

- capture/passive/once 수식어가 붙은 DOM 이벤트를 Angular 출력으로 노출(`SdOptionEventPlugin` 과 함께 동작). 성능·캡처가 필요한 이벤트 바인딩에 사용. 호스트 디렉티브로도 쓰임(시트가 `keydown.capture` 등 사용).

```html
<div (scroll.passive)="onScroll()" (keydown.capture)="onKeydown($event)">...</div>
```

### SdOptionEventPlugin

```ts
class SdOptionEventPlugin extends EventManagerPlugin
```

- `.capture`/`.passive`/`.once` 수식어 이벤트를 처리하는 Angular `EVENT_MANAGER_PLUGINS`. `provideSdAngular` 가 등록(직접 사용 안 함). `SdEvents` 디렉티브의 기반.

### SdCommandDirective — `[sdRefreshCommand]` / `[sdSaveCommand]` / `[sdInsertCommand]`

```ts
sdRefreshCommand = output<KeyboardEvent>(); // Ctrl+Alt+L
sdSaveCommand = output<KeyboardEvent>();    // Ctrl+S
sdInsertCommand = output<KeyboardEvent>();  // Insert
```

- 전역 키보드 단축키를 출력으로. 최상위 열린 모달 안에서만 동작(다른 화면 간섭 방지). crud 골격이 `sdSaveCommand` 로 CTRL+S 저장 연결.

### SdGlobalErrorHandlerPlugin

```ts
class SdGlobalErrorHandlerPlugin implements ErrorHandler
```

- 전역 에러 핸들러. 처리되지 않은 에러/Promise 거부를 시스템 로그 적재 + 전체화면 에러 오버레이로 표시(앱 destroy 후 클릭 시 reload). `provideSdAngular` 가 `ErrorHandler` 로 등록(직접 사용 안 함).

## 시각 효과·검증 디렉티브

### setupRipple / SdRipple — `[sdRipple]`

```ts
setupRipple(enableFn?: () => boolean): void;
// SdRipple: enabled = input.required({ alias: "sdRipple", transform: booleanAttribute });
```

- 클릭 시 파동(ripple) 효과. `setupRipple` 은 constructor 에서, `[sdRipple]="true"` 디렉티브는 템플릿에서. `enableFn`/`enabled` 가 false 면 효과 비활성(disabled 컨트롤). 버튼·체크박스·리스트가 사용.

### setupRevealOnShow / SdShowEffect — `[sdShowEffect]`

```ts
setupRevealOnShow(optFn?: () => { type?: "l2r" | "t2b"; enabled?: boolean }): void;
// SdShowEffect: enabled = input.required({ alias: "sdShowEffect" }); sdShowEffectType = input<"l2r"|"t2b">("t2b");
```

- 뷰포트 진입 시 페이드+슬라이드 노출 애니메이션. `type` `"t2b"`=위→아래(기본), `"l2r"`=좌→우. `enabled`=false 면 애니메이션 없이 즉시 표시.

### setupInvalid / SdInvalid — `[sdInvalid]`

```ts
setupInvalid(getInvalidMessage: () => string): void;
// SdInvalid: invalidMessage = input.required<string>({ alias: "sdInvalid" });
```

- 호스트에 숨김 input 을 붙여 native form 검증에 참여. `getInvalidMessage()`/`invalidMessage` 가 빈 문자열이 아니면 invalid(좌상단 빨간 인디케이터 + form 제출 차단). 폼 입력 컨트롤이 내부 사용.

## 타입드 템플릿 디렉티브

### SdTypedTemplate — `ng-template[typed]`

```ts
typed = input.required<T>();
```

- `ng-template` 컨텍스트 타입을 명시(`ngTemplateContextGuard`). 재귀 메뉴/트리 템플릿에서 `let-x` 의 타입 안전성 확보. `[typed]` 에 타입 토큰을 넘김.

### SdItemOfTemplate — `ng-template[itemOf]`

```ts
itemOf = input.required<TItem[]>();
// SdItemOfTemplateContext<TItem> { $implicit; item; index; depth }
```

- 반복 항목 템플릿 마커. `[itemOf]="items()"` 로 항목 타입을 추론해 `let-item`/`let-index`/`let-depth` 제공. select·shared-data·calendar 등의 항목 슬롯에 사용.

## signal·model 헬퍼

### setupModelHook

```ts
setupModelHook<T>(model: WritableSignal<T>, canFn: Signal<(item: T) => boolean | Promise<boolean>>): void;
```

- model 의 `set`/`update` 를 가로채 `canFn` 이 허용할 때만 적용. false 면 변경 거부, Promise 면 비동기 확인 후 적용(에러는 `ErrorHandler`). 체크박스·스위치·select-list 의 `canChangeFn` 이 사용.

### mark

```ts
mark(sig: WritableSignal<any>): void;
```

- in-place mutation 한 signal 값에 shallow copy(배열/객체)로 새 참조를 만들어 변경 통지. 시트 셀에서 객체 필드를 직접 수정한 뒤 호출(`(valueChange)="mark(items)"`).

### setSafeStyle

```ts
setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void;
```

- `Renderer2.setStyle` 로 여러 스타일을 한 번에 적용하는 헬퍼(키별 순회). `style` 객체의 각 CSS 속성을 엘리먼트에 설정. 디렉티브/composable 에서 DOM 스타일을 안전하게 줄 때 사용(`setupInvalid` 등이 내부 사용).

### FormatPipe — `| format`

```ts
@Pipe({ name: "format" }) transform(value: string | DateTime | DateOnly | undefined, format: string): string;
```

- 값 포맷. `DateTime`/`DateOnly` 는 `toFormatString(format)`, 문자열은 `X` 마스크(`|` 로 길이 분기). null 이면 빈 문자열(결측 보존). calendar 등이 사용.

```html
{{ date | format: "yyyy-MM-dd" }}
```

### 타입 유틸

```ts
DirectiveInputSignals<T> // 컴포넌트의 InputSignal 프로퍼티 → 값 타입 매핑(undefined 포함 필드는 optional)
UndefToOptional<T>       // undefined 포함 프로퍼티를 optional 로 변환
WithOptional<T, K>       // 특정 키 K 를 optional 로
SelectModalOutputResult<TKey> { selectedKeys: TKey[] } // 선택 모달 close 페이로드
```

- `DirectiveInputSignals<T>` — 모달/토스트/인쇄의 `inputs` 타입 계산에 쓰이는 유틸(컴포넌트 input signal 을 일반 값 객체로 매핑). `SelectModalOutputResult` — 선택형 모달이 close 로 돌려주는 표준 페이로드.
