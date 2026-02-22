# Helpers & Directives

## mergeStyles

Utility for merging inline style strings and `JSX.CSSProperties` objects.

```typescript
import { mergeStyles } from "@simplysm/solid";

const style = mergeStyles("color: red", { fontSize: "14px" }, props.style);
```

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

---

## createAppStructure

See [createAppStructure](hooks.md#createappstructure) in the Hooks documentation for full API details.

Exports the following types:

```typescript
import {
  createAppStructure,
  type AppStructure,
  type AppStructureItem,
  type AppStructureGroupItem,
  type AppStructureLeafItem,
  type AppStructureSubPerm,
  type AppRoute,
  type AppMenu,
  type AppFlatMenu,
  type AppPerm,
  type AppFlatPerm,
} from "@simplysm/solid";
```
