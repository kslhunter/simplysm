# TextInput / NumberInput prefixIcon Design

## Overview

Add a `prefixIcon` prop to `TextInput` and `NumberInput` components that displays an icon before the input field.

## Props

Both components get a new optional prop:

```typescript
prefixIcon?: Component<TablerIconProps>;
```

Same type as `Icon` component's `icon` prop — pass a Tabler icon component directly.

## Rendering

Inside the existing flex wrapper (`inline-flex items-center`), render `<Icon>` before the input:

```tsx
<Show when={local.prefixIcon}>
  <Icon icon={local.prefixIcon!} class={clsx(textMuted, "shrink-0")} />
</Show>
```

- Color: `textMuted` token (`text-base-400 dark:text-base-500`) — matches placeholder tone
- Size: Icon default `1.25em` — scales with field font size
- `shrink-0`: prevents icon from being compressed by flex
- `gap-1.5` added to wrapper for icon-to-input spacing

## Scope

Applied to all rendering modes:
- Standalone mode (editable / disabled+readonly)
- Inset mode (content div + overlay input)

## Files to Modify

1. `packages/solid/src/components/form-control/field/TextInput.tsx` — add prefixIcon prop + rendering
2. `packages/solid/src/components/form-control/field/NumberInput.tsx` — add prefixIcon prop + rendering
