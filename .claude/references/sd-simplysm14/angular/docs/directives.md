# Directives

## `SdEventsDirective`

`.capture`, `.passive`, `.once` 수식어 및 커스텀 이벤트 바인딩을 지원하는 디렉티브. Angular 템플릿에서 해당 이벤트를 사용할 때 자동 매칭된다.

```typescript
@Directive({
  selector: `[click.capture], [scroll.passive], [sdResize], [sdSaveCommand], ...`,
})
class SdEventsDirective {
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
  // 커스텀: sdResize (ISdResizeEvent)
  // 커맨드: sdRefreshCommand, sdSaveCommand, sdInsertCommand (KeyboardEvent)
}
```

## `SdRippleDirective`

호스트 요소에 리플 효과를 추가하는 디렉티브.

```typescript
@Directive({ selector: "[sd-ripple]" })
class SdRippleDirective {
  enabled = input.required({ alias: "sd-ripple", transform: booleanAttribute });
}
```

사용법: `<div [sd-ripple]="true">` 또는 `<div sd-ripple>`

## `SdShowEffectDirective`

뷰포트에 진입할 때 reveal 애니메이션을 적용하는 디렉티브. IntersectionObserver 사용.

```typescript
@Directive({ selector: "[sd-show-effect]" })
class SdShowEffectDirective {
  enabled = input.required({ alias: "sd-show-effect", transform: booleanAttribute });
  sdShowEffectType = input<"l2r" | "t2b">("t2b");
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `sd-show-effect` | `boolean` | required | 효과 활성화 여부 |
| `sdShowEffectType` | `"l2r" \| "t2b"` | `"t2b"` | 애니메이션 방향 (좌->우 / 위->아래) |

## `SdInvalidDirective`

호스트 요소에 유효성 검증 표시기를 추가하는 디렉티브. 빨간 점 표시기와 숨겨진 input으로 구성.

```typescript
@Directive({ selector: "[sd-invalid]" })
class SdInvalidDirective {
  invalidMessage = input.required<string>({ alias: "sd-invalid" });
}
```

사용법: `<div [sd-invalid]="name이 비어있습니다">`. 메시지가 빈 문자열이면 유효, 비어있지 않으면 무효.

## `SdTypedTemplateDirective`

`ng-template`의 컨텍스트 타입을 지정하는 디렉티브. 타입 가드를 통해 템플릿 내부에서 정확한 타입을 사용할 수 있다.

```typescript
@Directive({ selector: "ng-template[typed]" })
class SdTypedTemplateDirective<T> {
  typed = input.required<T>();

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplateDirective<TypeToken>,
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

## `SdItemOfTemplateDirective`

항목 반복 템플릿의 컨텍스트 타입을 지정하는 디렉티브.

```typescript
@Directive({ selector: "ng-template[itemOf]" })
class SdItemOfTemplateDirective<TItem> {
  itemOf = input.required<TItem[]>();

  static ngTemplateContextGuard<TContextItem>(
    _dir: SdItemOfTemplateDirective<TContextItem>,
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

## `SdRouterLinkDirective`

라우터 네비게이션 디렉티브. 일반 클릭은 라우터 네비게이션, Ctrl/Shift+클릭은 새 창, 팝업 윈도우에서는 팝업 형태로 열린다.

```typescript
@Directive({
  selector: "[sd-router-link]",
  host: {
    "[style.cursor]": "option() ? 'pointer' : ''",
    "(click)": "onClick($event)",
  },
})
class SdRouterLinkDirective {
  option = input<{
    link: string;
    params?: Record<string, string>;
    window?: { width?: number; height?: number };
    outletName?: string;
    queryParams?: Record<string, string>;
  } | undefined>(undefined, { alias: "sd-router-link" });
}
```

| Input Field | Type | Description |
|-------------|------|-------------|
| `link` | `string` | 네비게이션 경로 |
| `params` | `Record<string, string> \| undefined` | 라우터 파라미터 |
| `window` | `{ width?, height? } \| undefined` | 팝업 윈도우 크기 (설정 시 팝업으로 열림) |
| `outletName` | `string \| undefined` | named outlet |
| `queryParams` | `Record<string, string> \| undefined` | 쿼리 파라미터 |
