# Directives

## `SdEvents`

`.capture`, `.passive`, `.once` 수식어 및 커스텀 이벤트 바인딩을 지원하는 디렉티브. Angular 템플릿에서 해당 이벤트를 사용할 때 자동 매칭된다.

```typescript
@Directive({
  selector: `[click.capture], [scroll.passive], ...`,
})
class SdEvents {
  // 클릭: click.capture, click.once, click.capture.once
  // 마우스: mousedown.capture, mouseup.capture, mouseover.capture, mouseout.capture
  // 키보드: keydown.capture, keyup.capture
  // 포커스: focus.capture, blur.capture
  // 폼: invalid.capture
  // 스크롤: scroll.capture, scroll.passive, scroll.capture.passive
  // 휠: wheel.passive, wheel.capture.passive
  // 터치: touchstart.passive, touchstart.capture.passive, touchmove.passive, touchmove.capture.passive, touchend.passive
  // 드래그: dragover.capture, dragenter.capture, dragleave.capture, drop.capture
  // 애니메이션: transitionend.once, animationend.once
}
```

> **NOTE:** `sdResize`, `sdSaveCommand`, `sdRefreshCommand`, `sdInsertCommand`는 `SdEvents`에서 분리되어 각각 `SdResizeDirective`, `SdIntersectionDirective`, `SdCommandDirective`로 독립 디렉티브로 제공된다.

## `SdRipple`

호스트 요소에 리플 효과를 추가하는 디렉티브.

```typescript
@Directive({ selector: "[sdRipple]" })
class SdRipple {
  enabled = input.required({ alias: "sdRipple", transform: booleanAttribute });
}
```

사용법: `<div [sdRipple]="true">` 또는 `<div sdRipple>`

## `SdShowEffect`

뷰포트에 진입할 때 reveal 애니메이션을 적용하는 디렉티브. IntersectionObserver 사용.

```typescript
@Directive({ selector: "[sdShowEffect]" })
class SdShowEffect {
  enabled = input.required({ alias: "sdShowEffect", transform: booleanAttribute });
  sdShowEffectType = input<"l2r" | "t2b">("t2b");
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `sdShowEffect` | `boolean` | required | 효과 활성화 여부 |
| `sdShowEffectType` | `"l2r" \| "t2b"` | `"t2b"` | 애니메이션 방향 (좌->우 / 위->아래) |

## `SdInvalid`

호스트 요소에 유효성 검증 표시기를 추가하는 디렉티브. 빨간 점 표시기와 숨겨진 input으로 구성.

```typescript
@Directive({ selector: "[sdInvalid]" })
class SdInvalid {
  invalidMessage = input.required<string>({ alias: "sdInvalid" });
}
```

사용법: `<div [sdInvalid]="name이 비어있습니다">`. 메시지가 빈 문자열이면 유효, 비어있지 않으면 무효.

## `SdTypedTemplate`

`ng-template`의 컨텍스트 타입을 지정하는 디렉티브. 타입 가드를 통해 템플릿 내부에서 정확한 타입을 사용할 수 있다.

```typescript
@Directive({ selector: "ng-template[typed]" })
class SdTypedTemplate<T> {
  typed = input.required<T>();

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplate<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken;
}
```

사용법:
```html
<ng-template [typed]="typedVar" let-item>
  <!-- item의 타입이 typeof typedVar -->
</ng-template>
```

## `SdItemOfTemplate`

항목 반복 템플릿의 컨텍스트 타입을 지정하는 디렉티브.

```typescript
@Directive({ selector: "ng-template[itemOf]" })
class SdItemOfTemplate<TItem> {
  itemOf = input.required<TItem[]>();

  static ngTemplateContextGuard<TContextItem>(
    _dir: SdItemOfTemplate<TContextItem>,
    _ctx: unknown,
  ): _ctx is SdItemOfTemplateContext<TContextItem>;
}
```

## `SdItemOfTemplateContext`

itemOf 템플릿 컨텍스트.

```typescript
interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$implicit` | `TItem` | 현재 항목 (let-item으로 접근) |
| `item` | `TItem` | 현재 항목 (명시적 접근) |
| `index` | `number` | 인덱스 |
| `depth` | `number` | 깊이 (트리 구조에서 사용) |

사용법:
```html
<ng-template [itemOf]="items()" let-item let-index="index">
  {{ item.name }}
</ng-template>
```

## `SdCommandDirective`

키보드 단축키를 output 이벤트로 제공하는 디렉티브. `document` keydown을 감지하며, `shouldProcessCommandEvent()`로 최상위 모달만 이벤트 처리.

```typescript
@Directive({ selector: "[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]" })
class SdCommandDirective {
  sdRefreshCommand = output<KeyboardEvent>(); // Ctrl+Alt+L
  sdSaveCommand = output<KeyboardEvent>();    // Ctrl+S
  sdInsertCommand = output<KeyboardEvent>();  // Ctrl+Insert
}
```

사용법: `<div (sdSaveCommand)="onSave($event)" (sdRefreshCommand)="onRefresh($event)">`

## `SdResizeDirective`

ResizeObserver 기반 resize output 이벤트 디렉티브. `requestAnimationFrame`으로 디바운스.

```typescript
@Directive({ selector: "[sdResize]" })
class SdResizeDirective {
  sdResize = output<SdResizeEvent>();
}
```

사용법: `<div (sdResize)="onResize($event)">`

## `SdResizeEvent`

```typescript
interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: HTMLElement;
  contentRect: DOMRectReadOnly;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `heightChanged` | `boolean` | 높이 변경 여부 |
| `widthChanged` | `boolean` | 너비 변경 여부 |
| `target` | `HTMLElement` | 대상 요소 |
| `contentRect` | `DOMRectReadOnly` | 컨텐츠 영역 크기 |

## `SdIntersectionDirective`

IntersectionObserver 기반 intersection output 이벤트 디렉티브.

```typescript
@Directive({ selector: "[sdIntersection]" })
class SdIntersectionDirective {
  sdIntersection = output<SdIntersectionEvent>();
}
```

사용법: `<div (sdIntersection)="onIntersect($event)">`

## `SdIntersectionEvent`

```typescript
interface SdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `entry` | `IntersectionObserverEntry` | 마지막 IntersectionObserver 엔트리 |

## `SdRouterLink`

라우터 네비게이션 디렉티브. 일반 클릭은 라우터 네비게이션, Ctrl/Shift+클릭은 새 창, 팝업 윈도우에서는 팝업 형태로 열린다.

```typescript
@Directive({
  selector: "[sdRouterLink]",
  host: {
    "[style.cursor]": "option() ? 'pointer' : ''",
    "(click)": "onClick($event)",
  },
})
class SdRouterLink {
  option = input<{
    link: string;
    params?: Record<string, string>;
    window?: { width?: number; height?: number };
    outletName?: string;
    queryParams?: Record<string, string>;
  } | undefined>(undefined, { alias: "sdRouterLink" });
}
```

| Input Field | Type | Description |
|-------------|------|-------------|
| `link` | `string` | 네비게이션 경로 |
| `params` | `Record<string, string> \| undefined` | 라우터 파라미터 |
| `window` | `{ width?, height? } \| undefined` | 팝업 윈도우 크기 (설정 시 팝업으로 열림) |
| `outletName` | `string \| undefined` | named outlet |
| `queryParams` | `Record<string, string> \| undefined` | 쿼리 파라미터 |
