# Core Utilities

## Injection Utilities

### injectElementRef

Typed shorthand for `inject(ElementRef)`.

```typescript
import { injectElementRef } from "@simplysm/sd-angular";

@Component({...})
class MyComponent {
  private el = injectElementRef<HTMLDivElement>();
  // this.el.nativeElement is HTMLDivElement
}
```

### injectParent

Traverses the injector tree upward to find the nearest parent component of the given type. Useful for child controls that need to access their parent container.

```typescript
import { injectParent } from "@simplysm/sd-angular";

@Component({...})
class ChildControl {
  private parent = injectParent(ParentContainerControl);
  // Optional lookup:
  private maybeParent = injectParent(ParentContainerControl, { optional: true });
}
```

**Overloads:**

```typescript
function injectParent<T>(type?: AbstractType<T>): T;
function injectParent<T>(type: AbstractType<T>, options: { optional: true }): T | undefined;
```

---

## Router Signal Utilities

### useCurrentPageCodeSignal

Returns a signal of the current activated route's path as a dot-separated code string (e.g., `"sales.orders.detail"`). Returns `undefined` if not inside a router outlet.

```typescript
import { useCurrentPageCodeSignal } from "@simplysm/sd-angular";

const pageCode = useCurrentPageCodeSignal();
// pageCode?.() === "sales.orders"
```

### useFullPageCodeSignal

Returns a signal of the full URL path as a dot-separated code string, updated on `NavigationEnd`.

```typescript
import { useFullPageCodeSignal } from "@simplysm/sd-angular";

const fullCode = useFullPageCodeSignal();
```

### useParamMapSignal

Returns a signal wrapping the current route's `ParamMap`. Returns `undefined` outside a router context.

```typescript
import { useParamMapSignal } from "@simplysm/sd-angular";

const params = useParamMapSignal();
const id = computed(() => params?.().get("id"));
```

### useQueryParamMapSignal

Returns a signal wrapping the current route's query `ParamMap`. Returns `undefined` outside a router context.

```typescript
import { useQueryParamMapSignal } from "@simplysm/sd-angular";

const queryParams = useQueryParamMapSignal();
```

### useViewTitleSignal

Returns a computed signal with the view title, derived from the activated modal or the app structure provider.

```typescript
import { useViewTitleSignal } from "@simplysm/sd-angular";

const title = useViewTitleSignal();
// title() === "[Sales] Orders"
```

### useViewTypeSignal

Returns a computed signal indicating whether the component is rendered as a `"page"`, `"modal"`, or `"control"`.

```typescript
import { useViewTypeSignal } from "@simplysm/sd-angular";

@Component({...})
class MyView {
  viewType = useViewTypeSignal(() => this);
  // viewType() === "page" | "modal" | "control"
}
```

**Type:** `TSdViewType = "page" | "modal" | "control"`

### useSdSystemConfigResource

Creates a `$resource` linked to `SdSystemConfigProvider`. The component element tag is used as a key prefix automatically. Must be called inside a component (requires `ElementRef`).

```typescript
import { useSdSystemConfigResource } from "@simplysm/sd-angular";

const configKey = $signal<string>("layout");
const configResource = useSdSystemConfigResource<LayoutConfig>({ key: configKey });
// configResource.value() — loaded config (undefined until loaded)
// Set to trigger the saver: configResource.value.set(newConfig)
```

**Signature:**

```typescript
function useSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): ResourceRef<T | undefined>;
```

The key prefix is automatically derived from the host element tag (e.g., `"app-my-sheet.layout"`).

---

## Setup Utilities

### setupBgTheme

Sets a CSS custom property `--background-color` on `document.body` during the component's lifetime.

```typescript
import { setupBgTheme } from "@simplysm/sd-angular";

@Component({...})
class MyPage {
  constructor() {
    setupBgTheme({ theme: "primary", lightness: "lightest" });
  }
}
```

**Options:** `theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"`, `lightness?: "lightest" | "lighter"`

### setupCanDeactivate

Registers a can-deactivate guard for either a modal or a routed page component.

```typescript
import { setupCanDeactivate } from "@simplysm/sd-angular";

@Component({...})
class EditPage {
  constructor() {
    setupCanDeactivate(() => !this.hasChanges() || confirm("Discard changes?"));
  }
}
```

### setupInvalid

Adds an HTML5 validation indicator to the host element. Displays a small colored dot when the field is invalid.

```typescript
import { setupInvalid } from "@simplysm/sd-angular";

@Component({...})
class MyInput {
  value = model<string>();
  required = input(false);

  constructor() {
    setupInvalid(() => (this.required() && !this.value() ? "Required" : ""));
  }
}
```

### setupModelHook

Intercepts `.set()` calls on a model signal to run an async guard before updating.

```typescript
import { setupModelHook } from "@simplysm/sd-angular";

@Component({...})
class ConfirmedCheckbox {
  checked = model(false);
  canChangeFn = input<(v: boolean) => boolean | Promise<boolean>>(() => true);

  constructor() {
    setupModelHook(this.checked, this.canChangeFn);
  }
}
```

### setupRevealOnShow

Applies a reveal animation when the element enters the viewport.

```typescript
import { setupRevealOnShow } from "@simplysm/sd-angular";

@Component({...})
class AnimatedCard {
  constructor() {
    setupRevealOnShow(() => ({ type: "t2b", enabled: true }));
  }
}
```

**Options fn:** `() => { type?: "l2r" | "t2b"; enabled?: boolean }`

### setupRipple

Adds a material ripple effect to the host element on pointer press.

```typescript
import { setupRipple } from "@simplysm/sd-angular";

@Component({...})
class MyButton {
  disabled = input(false);

  constructor() {
    setupRipple(() => !this.disabled());
  }
}
```

### setupCumulateSelectedKeys

Keeps `selectedItems` and `selectedItemKeys` in sync bidirectionally.

```typescript
import { setupCumulateSelectedKeys } from "@simplysm/sd-angular";

constructor() {
  setupCumulateSelectedKeys({
    items: this.items,
    selectedItems: this.selectedItems,
    selectedItemKeys: this.selectedItemKeys,
    selectMode: () => this.selectMode(),
    keySelectorFn: (item) => item.id,
  });
}
```

### setupCloserWhenSingleSelectionChange

Automatically emits a close event when `selectMode === "single"` and the selection changes.

```typescript
import { setupCloserWhenSingleSelectionChange } from "@simplysm/sd-angular";

constructor() {
  setupCloserWhenSingleSelectionChange({
    selectedItemKeys: this.selectedItemKeys,
    selectedItems: this.selectedItems,
    selectMode: () => this.selectMode(),
    close: this.close,
  });
}
```

### setupModelHook

Already documented above.

---

## Manager Classes

### SdExpandingManager

Manages tree expansion state for hierarchical data in sheets and lists.

```typescript
import { SdExpandingManager } from "@simplysm/sd-angular";

const manager = new SdExpandingManager({
  items: this.items,
  expandedItems: this.expandedItems,
  getChildrenFn: $computed(() => (item, index) => item.children),
  sort: (items) => items.orderBy((i) => i.name),
});

// Computed signals:
// manager.flattedItems()   — flat list of all items (including children)
// manager.hasExpandable()  — whether any items have children
// manager.isAllExpanded()  — whether all expandable items are expanded

manager.toggle(item);
manager.toggleAll();
manager.getIsVisible(item);
manager.getDef(item); // returns ISdExpandItemDef<T>
```

**Constructor options:**

| Option          | Type                                                                  | Description                       |
| --------------- | --------------------------------------------------------------------- | --------------------------------- |
| `items`         | `Signal<T[]>`                                                         | Root items                        |
| `expandedItems` | `WritableSignal<T[]>`                                                 | Currently expanded items          |
| `getChildrenFn` | `Signal<((item: T, index: number) => T[] \| undefined) \| undefined>` | Returns children for an item      |
| `sort`          | `(items: T[]) => T[]`                                                 | Sort function applied to children |

**Computed signals:**

| Signal          | Type              | Description                               |
| --------------- | ----------------- | ----------------------------------------- |
| `flattedItems`  | `Signal<T[]>`     | Flat list of all visible items            |
| `hasExpandable` | `Signal<boolean>` | Whether any items have children           |
| `isAllExpanded` | `Signal<boolean>` | Whether all expandable items are expanded |

**Methods:** `toggle(item)`, `toggleAll()`, `getIsVisible(item): boolean`, `getDef(item): ISdExpandItemDef<T>`

**Interface `ISdExpandItemDef<T>`:**

```typescript
interface ISdExpandItemDef<T> {
  item: T;
  parentDef: ISdExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
```

### SdSelectionManager

Manages row selection state for sheets with single/multi/none modes.

```typescript
import { SdSelectionManager } from "@simplysm/sd-angular";

const manager = new SdSelectionManager({
  displayItems: this.displayItems,
  selectedItems: this.selectedItems,
  selectMode: this.selectMode,
  getItemSelectableFn: this.getItemSelectableFn,
});

// Computed signals:
// manager.hasSelectable()  — whether any item is selectable
// manager.isAllSelected()  — whether all selectable items are selected

manager.toggle(item);
manager.select(item);
manager.deselect(item);
manager.toggleAll();
manager.getIsSelected(item); // boolean
manager.getSelectable(item); // true | string (tooltip) | undefined (not selectable)
manager.getCanChangeFn(item); // () => boolean — guard for use with setupModelHook
```

**Computed signals:**

| Signal          | Type              | Description                               |
| --------------- | ----------------- | ----------------------------------------- |
| `hasSelectable` | `Signal<boolean>` | Whether at least one item is selectable   |
| `isAllSelected` | `Signal<boolean>` | Whether all selectable items are selected |

### SdSortingManager

Manages multi-column sort state for sheets.

```typescript
import { SdSortingManager } from "@simplysm/sd-angular";

const manager = new SdSortingManager({ sorts: this.sorts });

manager.toggle("name", false); // single sort
manager.toggle("age", true); // multi-sort
const sorted = manager.sort(items);
const defs = manager.defMap(); // Map<key, { indexText, desc }>
```

**Interface `ISdSortingDef`:** `{ key: string; desc: boolean }`

---

## Transform Functions

### transformBoolean

Input transform that converts `boolean | "" | undefined` to `boolean`. Used on attribute inputs.

```typescript
import { transformBoolean } from "@simplysm/sd-angular";

@Component({...})
class MyComponent {
  disabled = input(false, { transform: transformBoolean });
}
// <my-component disabled /> === disabled = true
// <my-component [disabled]="false" /> === disabled = false
```

### transformNullableBoolean

Like `transformBoolean` but returns `boolean | undefined` (keeps `undefined` as `undefined`).

```typescript
import { transformNullableBoolean } from "@simplysm/sd-angular";
```

---

## Other Utilities

### setSafeStyle

Applies multiple CSS styles to an element via Angular's `Renderer2`.

```typescript
import { setSafeStyle } from "@simplysm/sd-angular";

setSafeStyle(renderer, el, { position: "relative", overflow: "hidden" });
```

### TDirectiveInputSignals

Type utility that extracts the record type of all `InputSignal` properties from a directive/component class.

```typescript
import { TDirectiveInputSignals } from "@simplysm/sd-angular";

type MyInputs = TDirectiveInputSignals<MyComponent>;
// { title?: string; disabled?: boolean; ... }
```
