# SolidJS Guidelines

**SolidJS is NOT React!**

## Core Concepts

- Component functions run **once** at mount (not on every state change)
- Fine-grained reactivity: unchanged signals don't re-evaluate expressions
- `createMemo`: only for expensive computations used in multiple places
- **Props destructuring prohibited** → use `props.xxx`
- Conditionals: `<Show>`, Lists: `<For>`
- No SSR → browser APIs usable directly
- Responsive: Mobile UI below 520px
- Chrome 84+ target
  - CSS NOT transpiled → no `aspect-ratio`, `inset`, `:is()`, `:where()`

## Props Design

- Props that don't need parameters must accept plain values (`editable={perms().edit}`), not wrapped in functions (`editable={() => perms().edit}`) — use function props only when parameters are needed (callbacks)

## Implementation Rules

- Prefer signals/stores over Provider/Context
- Check existing patterns before introducing abstractions
- Before modifying components: always Read the file to check existing props/patterns

## Hook Naming

- `create*`: Reactive hooks wrapping SolidJS primitives
- `use*`: Hooks depending on Provider Context
- Others: no hook prefix

## Compound Components

All sub-components via dot notation only (`Parent.Child`).

- Define `interface ParentComponent { Child: typeof ChildComponent }`
- Assign `Parent.Child = ChildComponent;`
- Don't export sub-components separately (export parent only)
- UI elements → compound sub-components, non-rendering config (state, behavior, callbacks) → props

## Tailwind CSS

- `darkMode: "class"`, `aspectRatio` plugin disabled (Chrome 84)
- Semantic colors: `primary`(blue), `info`(sky), `success`(green), `warning`(amber), `danger`(red), `base`(zinc) → never use `zinc-*` directly
- Heights: `field`, `field-sm`, `field-lg`
- z-index: `sidebar`(100), `sidebar-backdrop`(99), `dropdown`(1000)
- Default `rem`, use `em` for text-relative sizing (e.g., Icon)
- Use `clsx()` with semantic grouping + `twMerge()` for conflict resolution
- Before modifying styles: Read existing class patterns of the same component

## Application View Naming (`client-*`)

- `~Sheet` — List view based on DataSheet (e.g., `UserSheet`)
- `~Detail` — Single record detail/edit view (e.g., `MyInfoDetail`)
- `~View` — Everything else (e.g., `LoginView`, `MainView`)
- Directory: `src/views/` (usable as standalone page, embedded component, or modal)
