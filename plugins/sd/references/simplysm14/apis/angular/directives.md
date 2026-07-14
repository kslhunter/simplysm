# @simplysm/angular — 디렉티브·이펙트

DOM 이벤트 옵션, 크기/교차 관찰, 전역 command 단축키, ripple/show/invalid effect, typed template을 host 요소에 붙이는 군임. 모두 standalone directive 또는 주입 컨텍스트에서 호출하는 setup 함수임. lint/template 규칙: [client-rules.md](../../manuals/client-rules.md)

## 이벤트 옵션·관찰

### `SdOptionEventPlugin`

```ts
class SdOptionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean;
  addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: Event) => void,
  ): () => void;
}
```

`provideSdAngular` 가 `EVENT_MANAGER_PLUGINS` 에 등록하는 Angular 이벤트 플러그인임. 템플릿 이벤트 바인딩에 점(.) suffix 옵션을 붙일 수 있게 함.

- `supports` — `.capture`/`.passive`/`.once` 중 하나 이상이 붙고, suffix를 제거한 실제 이벤트가 `window`/`document`/`HTMLElement.prototype` 에 존재할 때만 `true`.
- `addEventListener` — suffix로 `AddEventListenerOptions` 를 만들어 실제 이벤트 listener를 등록하고, 같은 옵션으로 제거하는 teardown을 반환함.
- suffix 효과 — `.capture` 는 `capture: true`(capture phase), `.passive` 는 `passive: true`(preventDefault 안 함, 스크롤 성능), `.once` 는 `once: true`(첫 발생 후 자동 제거). 조합 가능(예: `scroll.capture.passive`). `.outside`/`.prevent`/`.stop` 등은 지원하지 않음.

### `SdEvents`

```ts
@Directive selector: [click.capture],[click.once],[click.capture.once],
  [mousedown.capture],[mouseup.capture],[mouseover.capture],[mouseout.capture],
  [keydown.capture],[keyup.capture],[focus.capture],[blur.capture],[invalid.capture],
  [scroll.capture],[scroll.passive],[scroll.capture.passive],
  [wheel.passive],[wheel.capture.passive],
  [touchstart.passive],[touchstart.capture.passive],[touchmove.passive],
  [touchmove.capture.passive],[touchend.passive],
  [dragover.capture],[dragenter.capture],[dragleave.capture],[drop.capture],
  [transitionend.once],[animationend.once]
```

점 suffix가 붙은 이벤트 이름을 그대로 output 으로 노출하는 standalone directive임(Angular 바인딩 파서가 점 이름을 받도록). 실제 listener 등록·옵션은 `SdOptionEventPlugin` 이 처리함. inputs/host binding 없음.

- `.capture` outputs — `click`/`mousedown`/`mouseup`/`mouseover`/`mouseout`(`MouseEvent`), `keydown`/`keyup`(`KeyboardEvent`), `focus`/`blur`(`FocusEvent`, 버블 안 하므로 capture 사용), `invalid`(`Event`), `scroll`(`Event`), `dragover`/`dragenter`/`dragleave`/`drop`(`DragEvent`) 를 capture phase로 받음.
- `.passive` outputs — `scroll`(`Event`), `wheel`(`WheelEvent`), `touchstart`/`touchmove`/`touchend`(`TouchEvent`) 를 passive listener로 받음.
- `.once` outputs — `click`(`MouseEvent`), `transitionend`(`TransitionEvent`), `animationend`(`AnimationEvent`) 를 한 번만 받음.

### `SdResizeDirective` / `SdResizeEvent`

```ts
@Directive({ selector: "[sdResize]" })
class SdResizeDirective {
  sdResize: OutputEmitterRef<SdResizeEvent>;
}
interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: HTMLElement;
  contentRect: DOMRectReadOnly;
}
```

- `sdResize` — host에 `ResizeObserver` 를 붙이고 `requestAnimationFrame` 으로 코얼레싱해 크기 변경 시 emit함. destroy 때 frame 취소 + observer disconnect.
- `heightChanged` — 직전 `contentRect.height` 와 달라졌으면 `true`.
- `widthChanged` — 직전 `contentRect.width` 와 달라졌으면 `true`.
- `target` — resize entry의 target(`HTMLElement`).
- `contentRect` — observer entry의 `contentRect` 원본.

### `SdIntersectionDirective` / `SdIntersectionEvent`

```ts
@Directive({ selector: "[sdIntersection]" })
class SdIntersectionDirective {
  sdIntersection: OutputEmitterRef<SdIntersectionEvent>;
}
interface SdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```

- `sdIntersection` — host에 기본 옵션 `IntersectionObserver` 를 붙이고 entries가 있을 때만 마지막 entry를 emit함. destroy 때 disconnect.
- `entry` — observer callback의 마지막 `IntersectionObserverEntry`.

## command 단축키

### `SdCommandDirective`

```ts
@Directive({ selector: "[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]" })
class SdCommandDirective {
  sdRefreshCommand: OutputEmitterRef<KeyboardEvent>;
  sdSaveCommand: OutputEmitterRef<KeyboardEvent>;
  sdInsertCommand: OutputEmitterRef<KeyboardEvent>;
}
```

`document` keydown을 듣되 `ctrlKey && !shiftKey` 일 때만 처리함.

- `sdRefreshCommand` — `Ctrl+Alt+L`(L 키 + altKey)에 emit.
- `sdSaveCommand` — `Ctrl+S`(altKey 없음)에 emit.
- `sdInsertCommand` — `Ctrl+Insert`(altKey 없음)에 emit.
- 모달 스코프 — open modal(`sd-modal[data-sd-open]`)이 없거나, host가 최상위(z-index 최대) open modal 안에 있을 때만 처리함. 매칭 시 `preventDefault`/`stopPropagation` 후 해당 output emit.

## ripple·show effect

### `setupRipple` / `SdRipple`

```ts
function setupRipple(enableFn?: () => boolean): void;
@Directive({ selector: "[sdRipple]" })
class SdRipple {
  enabled: InputSignal<boolean>; /* required, alias "sdRipple", booleanAttribute */
}
```

- `enableFn` — pointerdown 시 ripple 생성 여부 게이트. 없거나 truthy면 생성, falsy면 생략.
- `enabled` — `[sdRipple]` alias의 **required** boolean input. `SdRipple` 이 `setupRipple(() => enabled())` 로 연결한다.
- 동작 — host를 `position: relative; overflow: hidden` 으로 두고 pointer 위치 기준 원형 indicator를 scale 애니메이션으로 펼친 뒤 pointerup/cancel/leave 때 opacity 0으로 fade-out·제거.
- browser guard — `isPlatformBrowser` 가 아니면 즉시 no-op.

### `setupRevealOnShow` / `SdShowEffect`

```ts
function setupRevealOnShow(optFn?: () => { type?: "l2r" | "t2b"; enabled?: boolean }): void;
@Directive({ selector: "[sdShowEffect]" })
class SdShowEffect {
  enabled: InputSignal<boolean>; // required, alias "sdShowEffect", booleanAttribute
  sdShowEffectType: InputSignal<"l2r" | "t2b">; // default "t2b"
}
```

- `type` — 숨김 시작 위치. `"t2b"`(기본)는 `translateY(-1em)` 에서 아래로, `"l2r"` 은 `translateX(-1em)` 에서 오른쪽으로 reveal함.
- `enabled` — `IntersectionObserver` 로 화면에 들어올 때 transition을 쓸지. `true` 면 `--animation-duration` ease-out으로 나타나고, `false` 면 transition 없이 즉시 표시.
- `sdShowEffectType` — `SdShowEffect` directive input(기본 `"t2b"`). `setupRevealOnShow` 의 `type` 으로 전달됨.

## invalid bridge

### `setupInvalid` / `SdInvalid`

```ts
function setupInvalid(getInvalidMessage: () => string): void;
@Directive({ selector: "[sdInvalid]" })
class SdInvalid {
  invalidMessage: InputSignal<string>; /* required, alias "sdInvalid" */
}
```

폼 컨트롤 내부에서 native validation을 흉내내는 헬퍼임. 대부분의 입력 컨트롤(`sd-textfield` 등)이 내부에서 `setupInvalid` 를 호출함.

- `getInvalidMessage` — hidden input의 `setCustomValidity` 에 넣을 메시지. 빈 문자열이면 valid.
- `invalidMessage` — `[sdInvalid]` alias의 **required** string input. 그대로 `getInvalidMessage` 로 전달함.
- 동작 — host에 빨간 indicator div와 숨겨진 text input(`.sd-invalid-input`)을 삽입함. `effect` 로 validity를 갱신해 invalid면 indicator를 `display: block`. host가 form 안이면 capture-phase `submit` 에서 validity를 refresh(invalid 시 submit 차단).
- focus 동작 — hidden input이 focus되면 host 또는 host의 첫 tabbable child/parent로 focus를 옮김.

## typed template

### `SdTypedTemplate<T>`

```ts
@Directive({ selector: "ng-template[typed]" })
class SdTypedTemplate<T> {
  typed: InputSignal<T>; // required
  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplate<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken;
}
```

- `typed` — `ng-template[typed]` 의 required type token input. 런타임 동작 없이 template context 타입을 `T` 로 고정함.
- `ngTemplateContextGuard` — 항상 `true`. template type narrowing 전용.

### `SdItemOfTemplate<TItem>` / `SdItemOfTemplateContext<TItem>`

```ts
@Directive({ selector: "ng-template[itemOf]" })
class SdItemOfTemplate<TItem> {
  itemOf: InputSignal<TItem[]>; // required
  static ngTemplateContextGuard<TContextItem>(...): _ctx is SdItemOfTemplateContext<TContextItem>;
}
interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
```

- `itemOf` — `ng-template[itemOf]` 의 required input. 배열 item 타입(`TItem`)을 template context로 전달하기 위한 type token임.
- `$implicit` — template 기본 변수(`let-x`)에 들어갈 현재 항목.
- `item` — 현재 항목의 명명 변수.
- `index` — 항목 순번.
- `depth` — 트리/계층 렌더링 깊이.
