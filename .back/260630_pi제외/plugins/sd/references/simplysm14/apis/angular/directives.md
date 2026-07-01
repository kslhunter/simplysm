# @simplysm/angular — 디렉티브·이펙트

DOM 이벤트 옵션, 관찰 이벤트, 전역 command key, ripple/show/invalid effect, typed template을 host에 붙이는 군이다. 모두 standalone directive 또는 주입 컨텍스트에서 호출하는 setup 함수다.

## 이벤트 옵션·관찰

### `SdOptionEventPlugin`

```ts
class SdOptionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;
  addEventListener(element: HTMLElement, eventName: string, handler: (event: Event) => void): () => void;
}
```

- `eventName` — `.capture`, `.passive`, `.once` 중 하나 이상이 붙은 DOM 이벤트 이름. plugin은 suffix를 제거한 실제 이벤트가 window/document/HTMLElement에 있을 때만 지원한다.
- `element` — 실제 listener를 붙일 HTMLElement.
- `handler` — 실제 이벤트가 발생하면 호출할 함수.
- suffix 동작 — `.capture` 는 capture listener, `.passive` 는 passive listener, `.once` 는 once listener 옵션을 켠다.

### `SdEvents`

```ts
class SdEvents {
  "click.capture": OutputEmitterRef<MouseEvent>;
  "click.once": OutputEmitterRef<MouseEvent>;
  "click.capture.once": OutputEmitterRef<MouseEvent>;
  "mousedown.capture": OutputEmitterRef<MouseEvent>;
  "mouseup.capture": OutputEmitterRef<MouseEvent>;
  "mouseover.capture": OutputEmitterRef<MouseEvent>;
  "mouseout.capture": OutputEmitterRef<MouseEvent>;
  "keydown.capture": OutputEmitterRef<KeyboardEvent>;
  "keyup.capture": OutputEmitterRef<KeyboardEvent>;
  "focus.capture": OutputEmitterRef<FocusEvent>;
  "blur.capture": OutputEmitterRef<FocusEvent>;
  "invalid.capture": OutputEmitterRef<Event>;
  "scroll.capture": OutputEmitterRef<Event>;
  "scroll.passive": OutputEmitterRef<Event>;
  "scroll.capture.passive": OutputEmitterRef<Event>;
  "wheel.passive": OutputEmitterRef<WheelEvent>;
  "wheel.capture.passive": OutputEmitterRef<WheelEvent>;
  "touchstart.passive": OutputEmitterRef<TouchEvent>;
  "touchstart.capture.passive": OutputEmitterRef<TouchEvent>;
  "touchmove.passive": OutputEmitterRef<TouchEvent>;
  "touchmove.capture.passive": OutputEmitterRef<TouchEvent>;
  "touchend.passive": OutputEmitterRef<TouchEvent>;
  "dragover.capture": OutputEmitterRef<DragEvent>;
  "dragenter.capture": OutputEmitterRef<DragEvent>;
  "dragleave.capture": OutputEmitterRef<DragEvent>;
  "drop.capture": OutputEmitterRef<DragEvent>;
  "transitionend.once": OutputEmitterRef<TransitionEvent>;
  "animationend.once": OutputEmitterRef<AnimationEvent>;
}
```

- `.capture` outputs — capture phase에서 필요한 mouse/key/focus/form/scroll/drag 이벤트를 Angular output으로 노출한다.
- `.passive` outputs — scroll/wheel/touch 계열을 passive listener로 받는다.
- `.once` outputs — click/transition/animation 종료 이벤트를 한 번만 받는다.

### `SdResizeDirective` / `SdResizeEvent`

```ts
class SdResizeDirective { sdResize: OutputEmitterRef<SdResizeEvent> }
interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: HTMLElement;
  contentRect: DOMRectReadOnly;
}
```

- `sdResize` — host에 `ResizeObserver` 를 붙이고 animation frame에서 마지막 entry를 emit한다.
- `heightChanged` — 직전 `contentRect.height` 와 달라졌는지 표시한다.
- `widthChanged` — 직전 `contentRect.width` 와 달라졌는지 표시한다.
- `target` — resize entry target을 HTMLElement로 전달한다.
- `contentRect` — observer entry의 `contentRect` 원본이다.

### `SdIntersectionDirective` / `SdIntersectionEvent`

```ts
class SdIntersectionDirective { sdIntersection: OutputEmitterRef<SdIntersectionEvent> }
interface SdIntersectionEvent { entry: IntersectionObserverEntry }
```

- `sdIntersection` — host에 `IntersectionObserver` 를 붙이고 entries가 있으면 마지막 entry를 emit한다.
- `entry` — observer callback에서 받은 마지막 `IntersectionObserverEntry`.

## command key

### `SdCommandDirective`

```ts
class SdCommandDirective {
  sdRefreshCommand: OutputEmitterRef<KeyboardEvent>;
  sdSaveCommand: OutputEmitterRef<KeyboardEvent>;
  sdInsertCommand: OutputEmitterRef<KeyboardEvent>;
}
```

- `sdRefreshCommand` — document keydown에서 `Ctrl+Alt+L` 이고 최상위 open modal 안의 element이거나 open modal이 없을 때 emit한다.
- `sdSaveCommand` — document keydown에서 `Ctrl+S` 이고 `Alt`/`Shift` 가 없으며 처리 대상이면 emit한다.
- `sdInsertCommand` — document keydown에서 `Ctrl+Insert` 이고 `Alt`/`Shift` 가 없으며 처리 대상이면 emit한다.
- 공통 동작 — command가 처리되면 `preventDefault`/`stopPropagation` 을 호출한다.

## ripple·show effect

### `setupRipple` / `SdRipple`

```ts
function setupRipple(enableFn?: () => boolean): void
class SdRipple { enabled: InputSignal<boolean> }
```

- `enableFn` — pointerdown 시 ripple 생성 여부를 판단한다. 없거나 true면 진행, false면 생성하지 않는다.
- `enabled` — `[sdRipple]` alias boolean input. true면 `setupRipple(() => enabled())` 이 pointer ripple을 만든다.
- 동작 — host style을 `position: relative; overflow: hidden` 으로 두고 pointer 위치 기준 원형 indicator를 만들며 pointerup/cancel/leave 때 opacity 0으로 제거한다.
- browser guard — browser가 아니면 아무 작업도 하지 않는다.

### `setupRevealOnShow` / `SdShowEffect`

```ts
function setupRevealOnShow(optFn?: () => { type?: "l2r" | "t2b"; enabled?: boolean }): void
class SdShowEffect {
  enabled: InputSignal<boolean>;
  sdShowEffectType: InputSignal<"l2r" | "t2b">;
}
```

- `type` — `"t2b"` 는 초깃값 `translateY(-1em)`, `"l2r"` 는 `translateX(-1em)` 로 숨김 위치를 정한다. 기본은 `"t2b"`.
- `enabled` — intersection 시 transition을 쓸지 정한다. false면 opacity만 1로 만들고 transition style을 비운다.
- `sdShowEffectType` — directive input. 기본 `"t2b"`; `SdShowEffect` 가 `setupRevealOnShow` 에 전달한다.

## invalid bridge

### `setupInvalid` / `SdInvalid`

```ts
function setupInvalid(getInvalidMessage: () => string): void
class SdInvalid { invalidMessage: InputSignal<string> }
```

- `getInvalidMessage` — hidden input의 `setCustomValidity` 에 넣을 메시지를 반환한다. 빈 문자열이면 valid.
- `invalidMessage` — `[sdInvalid]` alias required string input. 이 값을 `getInvalidMessage` 로 전달한다.
- 동작 — host에 indicator div와 hidden text input을 삽입하고, form submit capture에서 validity를 refresh한다.
- focus 동작 — hidden input이 focus되면 host 또는 host의 첫 tabbable child/parent로 focus를 옮긴다.

## typed template

### `SdTypedTemplate<T>`

```ts
class SdTypedTemplate<T> {
  typed: InputSignal<T>;
  static ngTemplateContextGuard<TypeToken>(_dir: SdTypedTemplate<TypeToken>, _ctx: unknown): _ctx is TypeToken;
}
```

- `typed` — `ng-template[typed]` 의 required type token input. runtime 동작 없이 template context 타입을 고정한다.
- `ngTemplateContextGuard` — 항상 true를 반환해 Angular template type narrowing에만 사용한다.

### `SdItemOfTemplate<TItem>` / `SdItemOfTemplateContext<TItem>`

```ts
class SdItemOfTemplate<TItem> {
  itemOf: InputSignal<TItem[]>;
  static ngTemplateContextGuard<TContextItem>(...): _ctx is SdItemOfTemplateContext<TContextItem>;
}
interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
```

- `itemOf` — `ng-template[itemOf]` required input. 배열 item 타입을 template context로 전달하기 위한 type token이다.
- `$implicit` — template 기본 변수에 들어갈 항목.
- `item` — 명명된 항목 변수.
- `index` — 렌더링 순번.
- `depth` — 트리/계층 렌더링 깊이.
