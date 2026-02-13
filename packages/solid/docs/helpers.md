# Helpers & Directives

## mergeStyles

Utility for merging inline style strings and `JSX.CSSProperties` objects.

```typescript
import { mergeStyles } from "@simplysm/solid";

const style = mergeStyles("color: red", { fontSize: "14px" }, props.style);
```

---

## splitSlots

Utility for splitting children into named slots based on component type.

```typescript
import { splitSlots } from "@simplysm/solid";

const slots = splitSlots(props.children, {
  header: HeaderComponent,
  footer: FooterComponent,
});
// slots.header, slots.footer, slots.rest
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
