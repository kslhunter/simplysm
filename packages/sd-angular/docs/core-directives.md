# Core Directives and Pipes

## Directives

### SdEventsDirective

Adds support for DOM events with modifiers (capture, passive, once) and custom sd-angular events as Angular output bindings on any element.

**Selector:** matches any element with the supported event attributes.

**Custom events:**

| Attribute            | Event type       | Description          |
| -------------------- | ---------------- | -------------------- |
| `(sdResize)`         | `ISdResizeEvent` | Element size changed |
| `(sdRefreshCommand)` | `KeyboardEvent`  | Ctrl+Alt+L pressed   |
| `(sdSaveCommand)`    | `KeyboardEvent`  | Ctrl+S pressed       |
| `(sdInsertCommand)`  | `KeyboardEvent`  | Ctrl+Insert pressed  |

**Modifier events (selection):**

| Attribute                                                           | Description                 |
| ------------------------------------------------------------------- | --------------------------- |
| `(click.capture)`, `(click.once)`, `(click.capture.once)`           | Click with capture/once     |
| `(scroll.passive)`, `(scroll.capture.passive)`                      | Scroll with passive/capture |
| `(wheel.passive)`, `(wheel.capture.passive)`                        | Wheel with passive          |
| `(touchstart.passive)`, `(touchmove.passive)`, `(touchend.passive)` | Touch passive               |
| `(keydown.capture)`, `(keyup.capture)`                              | Keyboard capture            |
| `(focus.capture)`, `(blur.capture)`                                 | Focus/blur capture          |
| `(transitionend.once)`, `(animationend.once)`                       | Animation/transition once   |
| `(dragover.capture)` etc.                                           | Drag capture events         |

---

### SdInvalidDirective

Applies invalid state styling by delegating to `setupInvalid`. Displays a colored dot indicator when the message is non-empty.

**Selector:** `[sd-invalid]`

```html
<div [sd-invalid]="validationMessage()"></div>
```

**Input:** `sd-invalid: string` (required) — the validation message. Empty string = valid.

---

### SdRippleDirective

Applies a material ripple effect to the host element.

**Selector:** `[sd-ripple]`

```html
<button [sd-ripple]="true">Click me</button>
<button [sd-ripple]="!disabled">Click me</button>
```

**Input:** `sd-ripple: boolean` (required) — whether ripple is enabled.

---

### SdRouterLinkDirective

Navigation directive with support for popup windows. Handles Ctrl/Alt/Shift modifier keys for new tab/window behavior.

**Selector:** `[sd-router-link]`

```html
<div [sd-router-link]="{ link: '/orders/detail', params: { id: '42' } }">Open Order</div>

<!-- Open in popup window -->
<div [sd-router-link]="{ link: '/print', window: { width: 900, height: 700 } }">Print</div>
```

**Input option object:**

| Field          | Type                     | Description            |
| -------------- | ------------------------ | ---------------------- |
| `link`         | `string`                 | Route path             |
| `params?`      | `Record<string, string>` | Route parameters       |
| `queryParams?` | `Record<string, string>` | Query parameters       |
| `window?`      | `{ width?, height? }`    | Open in a popup window |
| `outletName?`  | `string`                 | Named router outlet    |

**Key behavior:**

- Default: navigate in-place
- Ctrl+click: new tab (background)
- Alt+click: new tab (focused)
- Shift+click or `window` set: popup window

---

### SdShowEffectDirective

Applies a reveal animation (fade+translate) when the element scrolls into view.

**Selector:** `[sd-show-effect]`

```html
<div [sd-show-effect]="true" [sd-show-effect-type]="'l2r'">...</div>
```

**Inputs:**

| Input                 | Type             | Default  | Description              |
| --------------------- | ---------------- | -------- | ------------------------ |
| `sd-show-effect`      | `boolean`        | required | Enable/disable animation |
| `sd-show-effect-type` | `"l2r" \| "t2b"` | `"t2b"`  | Animation direction      |

---

### SdItemOfTemplateDirective

Template type-guard directive for `*ngFor`-like contexts. Enables TypeScript type narrowing inside `ng-template`.

**Selector:** `ng-template[itemOf]`

```html
<ng-template [itemOf]="items" let-item let-index="index">
  {{ item.name }}
  <!-- item is typed as the element type of `items` -->
</ng-template>
```

**Input:** `itemOf: TItem[]` (required)

**Context `SdItemOfTemplateContext<TItem>`:**

| Variable    | Type     | Description                       |
| ----------- | -------- | --------------------------------- |
| `$implicit` | `TItem`  | The item                          |
| `item`      | `TItem`  | The item (same as $implicit)      |
| `index`     | `number` | Current index                     |
| `depth`     | `number` | Tree depth (for hierarchical use) |

---

### SdTypedTemplateDirective

Template type-guard directive for strongly typing arbitrary template contexts.

**Selector:** `ng-template[typed]`

```html
<ng-template #tpl [typed]="myContextType" let-data>
  {{ data.value }}
  <!-- data is typed as typeof myContextType -->
</ng-template>
```

**Input:** `typed: T` (required) — the context type token (a value whose type matches the template context).

---

## Pipes

### FormatPipe

Formats `DateTime`, `DateOnly`, or string values.

**Name:** `format`

```html
{{ dateValue | format: 'yyyy-MM-dd' }} {{ dateTimeValue | format: 'yyyy-MM-dd HH:mm' }}
<!-- String masking with X placeholders -->
{{ '01012345678' | format: 'XXX-XXXX-XXXX' }}
<!-- Multiple format patterns separated by | -->
{{ phoneNumber | format: 'XXX-XXX-XXXX|XXX-XXXX-XXXX' }}
```

**Signature:**

```typescript
transform(value: string | DateTime | DateOnly | undefined, format: string): string
```

For `DateTime`/`DateOnly`: delegates to `.toFormatString(format)`.

For strings: uses `X` as a character placeholder; tries each `|`-separated format pattern matching the value length.

---

## Event Manager Plugins

These are Angular `EventManagerPlugin` implementations registered automatically by `provideSdAngular`. They are not used directly but enable the custom event syntax.

| Plugin                        | Custom Event                              | Trigger                                     |
| ----------------------------- | ----------------------------------------- | ------------------------------------------- |
| `SdSaveCommandEventPlugin`    | `sdSaveCommand`                           | Ctrl+S                                      |
| `SdRefreshCommandEventPlugin` | `sdRefreshCommand`                        | Ctrl+Alt+L                                  |
| `SdInsertCommandEventPlugin`  | `sdInsertCommand`                         | Ctrl+Insert                                 |
| `SdResizeEventPlugin`         | `sdResize`                                | Element size change (ResizeObserver)        |
| `SdIntersectionEventPlugin`   | `sdIntersection`                          | Element intersection (IntersectionObserver) |
| `SdOptionEventPlugin`         | any event + `.capture`/`.passive`/`.once` | Event with options                          |
| `SdBackbuttonEventPlugin`     | `sdBackbutton`                            | Back button (deprecated)                    |

**Command event behavior:** The save/refresh/insert plugins only fire on the topmost modal if any modals are open; otherwise they fire on the page level.

**`ISdResizeEvent`:**

```typescript
interface ISdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: Element;
  contentRect: DOMRectReadOnly;
}
```

**`ISdIntersectionEvent`:**

```typescript
interface ISdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```
