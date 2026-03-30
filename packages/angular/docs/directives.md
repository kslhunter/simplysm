# Directives

## `SdEventsDirective`

Exposes capture, passive, once, and custom event outputs for template binding. Automatically selected when using supported event bindings.

Selector: `[click.capture]`, `[click.once]`, `[mousedown.capture]`, `[scroll.passive]`, `[sdResize]`, `[sdSaveCommand]`, etc.

Outputs:

| Output | Type | Description |
|--------|------|-------------|
| `click.capture` | `OutputEmitterRef<MouseEvent>` | Click in capture phase |
| `click.once` | `OutputEmitterRef<MouseEvent>` | Click once |
| `click.capture.once` | `OutputEmitterRef<MouseEvent>` | Click capture once |
| `mousedown.capture` | `OutputEmitterRef<MouseEvent>` | Mouse down capture |
| `mouseup.capture` | `OutputEmitterRef<MouseEvent>` | Mouse up capture |
| `mouseover.capture` | `OutputEmitterRef<MouseEvent>` | Mouse over capture |
| `mouseout.capture` | `OutputEmitterRef<MouseEvent>` | Mouse out capture |
| `keydown.capture` | `OutputEmitterRef<KeyboardEvent>` | Key down capture |
| `keyup.capture` | `OutputEmitterRef<KeyboardEvent>` | Key up capture |
| `focus.capture` | `OutputEmitterRef<FocusEvent>` | Focus capture |
| `blur.capture` | `OutputEmitterRef<FocusEvent>` | Blur capture |
| `invalid.capture` | `OutputEmitterRef<Event>` | Invalid capture |
| `scroll.capture` | `OutputEmitterRef<Event>` | Scroll capture |
| `scroll.passive` | `OutputEmitterRef<Event>` | Scroll passive |
| `scroll.capture.passive` | `OutputEmitterRef<Event>` | Scroll capture passive |
| `wheel.passive` | `OutputEmitterRef<WheelEvent>` | Wheel passive |
| `wheel.capture.passive` | `OutputEmitterRef<WheelEvent>` | Wheel capture passive |
| `touchstart.passive` | `OutputEmitterRef<TouchEvent>` | Touch start passive |
| `touchstart.capture.passive` | `OutputEmitterRef<TouchEvent>` | Touch start capture passive |
| `touchmove.passive` | `OutputEmitterRef<TouchEvent>` | Touch move passive |
| `touchmove.capture.passive` | `OutputEmitterRef<TouchEvent>` | Touch move capture passive |
| `touchend.passive` | `OutputEmitterRef<TouchEvent>` | Touch end passive |
| `dragover.capture` | `OutputEmitterRef<DragEvent>` | Drag over capture |
| `dragenter.capture` | `OutputEmitterRef<DragEvent>` | Drag enter capture |
| `dragleave.capture` | `OutputEmitterRef<DragEvent>` | Drag leave capture |
| `drop.capture` | `OutputEmitterRef<DragEvent>` | Drop capture |
| `transitionend.once` | `OutputEmitterRef<TransitionEvent>` | Transition end once |
| `animationend.once` | `OutputEmitterRef<AnimationEvent>` | Animation end once |
| `sdResize` | `OutputEmitterRef<ISdResizeEvent>` | Resize observer event |
| `sdRefreshCommand` | `OutputEmitterRef<KeyboardEvent>` | Ctrl+Alt+L command |
| `sdSaveCommand` | `OutputEmitterRef<KeyboardEvent>` | Ctrl+S command |
| `sdInsertCommand` | `OutputEmitterRef<KeyboardEvent>` | Ctrl+Insert command |

## `SdRippleDirective`

Adds material-style ripple effect on pointer interaction.

Selector: `[sd-ripple]`

| Input | Type | Description |
|-------|------|-------------|
| `sd-ripple` (alias) | `boolean` (required, booleanAttribute) | Whether ripple is enabled |

## `SdShowEffectDirective`

Animates element reveal when it enters the viewport via IntersectionObserver.

Selector: `[sd-show-effect]`

| Input | Type | Description |
|-------|------|-------------|
| `sd-show-effect` (alias) | `boolean` (required, booleanAttribute) | Whether effect is enabled |
| `sdShowEffectType` | `"l2r" \| "t2b"` | Animation direction (default: `"t2b"`) |

## `SdInvalidDirective`

Shows a validation indicator with a custom message on the host element. Integrates with form validation.

Selector: `[sd-invalid]`

| Input | Type | Description |
|-------|------|-------------|
| `sd-invalid` (alias) | `string` (required) | Validation error message (empty string = valid) |

## `SdTypedTemplateDirective`

Provides type-safe ng-template context guard for custom template contexts.

Selector: `ng-template[typed]`

| Input | Type | Description |
|-------|------|-------------|
| `typed` | `T` (required) | Context type token |

```typescript
class SdTypedTemplateDirective<T> {
  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplateDirective<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken;
}
```

## `SdItemOfTemplateDirective`

Provides typed iteration context for ng-template. Used for passing item type information to template outlets.

Selector: `ng-template[itemOf]`

| Input | Type | Description |
|-------|------|-------------|
| `itemOf` | `TItem[]` (required) | Array of items for type inference |

```typescript
class SdItemOfTemplateDirective<TItem> {
  static ngTemplateContextGuard<TContextItem>(
    _dir: SdItemOfTemplateDirective<TContextItem>,
    _ctx: unknown,
  ): _ctx is SdItemOfTemplateContext<TContextItem>;
}
```

### `SdItemOfTemplateContext`

| Field | Type | Description |
|-------|------|-------------|
| `$implicit` | `TItem` | The current item |
| `item` | `TItem` | The current item (named) |
| `index` | `number` | Item index |
| `depth` | `number` | Nesting depth |

## `SdRouterLinkDirective`

Navigation directive supporting router navigation, window opening, and outlet navigation. Ctrl/Alt+click opens in new tab; Shift+click opens in new window.

Selector: `[sd-router-link]`

| Input | Type | Description |
|-------|------|-------------|
| `sd-router-link` (alias) | `object \| undefined` | Navigation option |

Option object fields:

| Field | Type | Description |
|-------|------|-------------|
| `link` | `string` | Target route path |
| `params` | `Record<string, string>` | Optional route parameters |
| `window` | `{ width?: number; height?: number }` | Optional window dimensions |
| `outletName` | `string` | Optional named outlet |
| `queryParams` | `Record<string, string>` | Optional query parameters |

## `SdCardDirective`

Applies card styling (CSS class `card`) to the host element.

Selector: `sd-card`, `[sd-card]`

No inputs.

## `SdPaneDirective`

Applies fill-area pane styling (CSS class `fill`, `display: block`) to the host element.

Selector: `sd-pane`, `[sd-pane]`

No inputs.
