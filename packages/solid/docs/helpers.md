# Helpers & Directives

## mergeStyles

Utility for merging inline style strings and `JSX.CSSProperties` objects.

```typescript
import { mergeStyles } from "@simplysm/solid";

const style = mergeStyles("color: red", { fontSize: "14px" }, props.style);
```

---

## splitSlots

Utility for splitting resolved children into named slots based on `data-*` attributes. Returns a tuple of `[slots accessor, content accessor]`.

Slot keys are matched against the element's `dataset` (camelCase). Sub-components that set a matching data attribute (e.g., `data-select-header`) are separated into the named slot; all other children remain in `content`.

```typescript
import { splitSlots } from "@simplysm/solid";
import { children } from "solid-js";

// Inside a component:
const resolved = children(() => props.children);
const [slots, content] = splitSlots(resolved, ["selectHeader", "selectAction"] as const);

// Access inside JSX (within a reactive context)
<div>{slots().selectHeader}</div>   // HTMLElement[] matching data-select-header
<div>{content()}</div>             // JSX.Element[] – remaining children
```

**Signature:**

```typescript
function splitSlots<K extends string>(
  resolved: { toArray: () => unknown[] },
  keys: readonly K[],
): [Accessor<Record<K, HTMLElement[]>>, Accessor<JSX.Element[]>]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `resolved` | `{ toArray: () => unknown[] }` | Resolved children from SolidJS `children()` |
| `keys` | `readonly K[]` | Slot key names (camelCase, matched against `element.dataset`) |

Returns a tuple:
- `slots` — `Accessor<Record<K, HTMLElement[]>>` — named slot elements per key
- `content` — `Accessor<JSX.Element[]>` — remaining children not matched by any key

---

## ripple directive

Material Design ripple effect directive. Displays ripple effect on click.

```tsx
import { ripple } from "@simplysm/solid";
// Keep reference to register directive
void ripple;

<button use:ripple={true}>Click</button>
<button use:ripple={!props.disabled}>Conditional activation</button>
```

- Creates internal ripple container, operates without affecting parent element
- Automatically disabled when `prefers-reduced-motion: reduce` is set
- Single ripple mode: removes previous ripple on new click
