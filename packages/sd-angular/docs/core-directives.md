# Core - Directives

## SdEventsDirective

**Type:** `@Directive` | **Selector:** Multiple event selectors (see below)

Unified event directive that enables capture, passive, and once event modifiers for Angular templates. Also provides custom events for resize and keyboard commands.

### Supported Event Outputs

| Output | Type | Description |
|--------|------|-------------|
| `click.capture` | `OutputEmitterRef<MouseEvent>` | Click event in capture phase |
| `click.once` | `OutputEmitterRef<MouseEvent>` | Click event, fires once |
| `click.capture.once` | `OutputEmitterRef<MouseEvent>` | Click capture, fires once |
| `mousedown.capture` | `OutputEmitterRef<MouseEvent>` | Mousedown in capture phase |
| `mouseup.capture` | `OutputEmitterRef<MouseEvent>` | Mouseup in capture phase |
| `mouseover.capture` | `OutputEmitterRef<MouseEvent>` | Mouseover in capture phase |
| `mouseout.capture` | `OutputEmitterRef<MouseEvent>` | Mouseout in capture phase |
| `keydown.capture` | `OutputEmitterRef<KeyboardEvent>` | Keydown in capture phase |
| `keyup.capture` | `OutputEmitterRef<KeyboardEvent>` | Keyup in capture phase |
| `focus.capture` | `OutputEmitterRef<FocusEvent>` | Focus in capture phase (required since focus doesn't bubble) |
| `blur.capture` | `OutputEmitterRef<FocusEvent>` | Blur in capture phase |
| `invalid.capture` | `OutputEmitterRef<Event>` | Invalid in capture phase |
| `scroll.capture` | `OutputEmitterRef<Event>` | Scroll in capture phase |
| `scroll.passive` | `OutputEmitterRef<Event>` | Scroll with passive option |
| `scroll.capture.passive` | `OutputEmitterRef<Event>` | Scroll capture + passive |
| `wheel.passive` | `OutputEmitterRef<WheelEvent>` | Wheel with passive option |
| `wheel.capture.passive` | `OutputEmitterRef<WheelEvent>` | Wheel capture + passive |
| `touchstart.passive` | `OutputEmitterRef<TouchEvent>` | Touchstart with passive |
| `touchstart.capture.passive` | `OutputEmitterRef<TouchEvent>` | Touchstart capture + passive |
| `touchmove.passive` | `OutputEmitterRef<TouchEvent>` | Touchmove with passive |
| `touchmove.capture.passive` | `OutputEmitterRef<TouchEvent>` | Touchmove capture + passive |
| `touchend.passive` | `OutputEmitterRef<TouchEvent>` | Touchend with passive |
| `dragover.capture` | `OutputEmitterRef<DragEvent>` | Dragover in capture phase |
| `dragenter.capture` | `OutputEmitterRef<DragEvent>` | Dragenter in capture phase |
| `dragleave.capture` | `OutputEmitterRef<DragEvent>` | Dragleave in capture phase |
| `drop.capture` | `OutputEmitterRef<DragEvent>` | Drop in capture phase |
| `transitionend.once` | `OutputEmitterRef<TransitionEvent>` | Transition end, fires once |
| `animationend.once` | `OutputEmitterRef<AnimationEvent>` | Animation end, fires once |
| `sdResize` | `OutputEmitterRef<ISdResizeEvent>` | Custom resize event |
| `sdRefreshCommand` | `OutputEmitterRef<KeyboardEvent>` | Ctrl+Alt+L refresh command |
| `sdSaveCommand` | `OutputEmitterRef<KeyboardEvent>` | Ctrl+S save command |
| `sdInsertCommand` | `OutputEmitterRef<KeyboardEvent>` | Ctrl+Insert insert command |

---

## SdInvalidDirective

**Type:** `@Directive` | **Selector:** `[sd-invalid]`

Attaches a validation indicator to an element. Displays a small colored dot when the validation message is non-empty.

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `sd-invalid` | `string` | Yes | Validation error message (empty = valid) |

---

## SdItemOfTemplateDirective

**Type:** `@Directive` | **Selector:** `ng-template[itemOf]`

Provides type-safe template context when iterating over items in templates. Used with `*ngTemplateOutlet`.

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `itemOf` | `TItem[]` | Yes | The array of items for type inference |

### SdItemOfTemplateContext

```typescript
interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
```

---

## SdRippleDirective

**Type:** `@Directive` | **Selector:** `[sd-ripple]`

Adds a Material Design ripple effect to the host element on pointer interaction.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sd-ripple` | `boolean \| ""` | Yes | -- | Enable/disable the ripple effect |

---

## SdRouterLinkDirective

**Type:** `@Directive` | **Selector:** `[sd-router-link]`

Enhanced router link that supports opening in new windows/tabs. Modifier keys change behavior:
- **Click**: Navigate within the app
- **Ctrl+Click**: Open in new background tab
- **Alt+Click**: Open in new foreground tab
- **Shift+Click**: Open in new window

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `sd-router-link` | `object \| undefined` | No | Navigation options (see below) |

**Option object:**

| Field | Type | Description |
|-------|------|-------------|
| `link` | `string` | Route path |
| `params` | `Record<string, string>` | Route parameters |
| `window` | `{ width?: number; height?: number }` | New window dimensions |
| `outletName` | `string` | Named router outlet |
| `queryParams` | `Record<string, string>` | Query parameters |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `onClick` | `(event: MouseEvent) => Promise<void>` | Handles click with modifier key logic |

---

## SdShowEffectDirective

**Type:** `@Directive` | **Selector:** `[sd-show-effect]`

Applies a reveal animation (fade + translate) when the element becomes visible via IntersectionObserver.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sd-show-effect` | `boolean \| ""` | Yes | -- | Enable/disable the effect |
| `sd-show-effect-type` | `"l2r" \| "t2b"` | No | `"t2b"` | Animation direction (left-to-right or top-to-bottom) |

---

## SdTypedTemplateDirective

**Type:** `@Directive` | **Selector:** `ng-template[typed]`

Provides a type-safe template context guard. The generic type parameter becomes the template context type.

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `typed` | `T` | Yes | Type token for context inference |
