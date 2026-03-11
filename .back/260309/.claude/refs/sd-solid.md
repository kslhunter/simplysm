# SolidJS Guidelines

**SolidJS is NOT React!**

## Core Concepts

- Component functions execute **only once** at mount (not on every state change)
- Fine-grained reactivity: unchanged signals do not re-evaluate expressions
- `createMemo`: use only when an expensive computation is used in multiple places
- **No props destructuring** → use `props.xxx`
- No SSR → browser APIs can be used directly
- Responsive: mobile UI below 520px
- Target Chrome 84+
  - No CSS transpilation → do not use `aspect-ratio`, `inset`, `:is()`, `:where()`

## Props Design

- Props that need no parameters must accept plain values (`editable={perms().edit}`). Do not wrap in a function (`editable={() => perms().edit}`) — function props are only for cases that require parameters (callbacks)

## Hook Naming

- `create*`: reactive hooks that wrap SolidJS primitives
- `use*`: hooks that depend on Provider Context
- Other: do not use hook prefixes

## Boolean Prop Defaults

- Name boolean props so their default value is `false`
- When a feature is ON by default, use `hide*`, `disable*` patterns
- Avoid double negation: `hideX={false}` is clearer than `showX={true}` (when both mean "show X")
- Exception: native HTML attributes like `draggable` may default to `true`

## Compound Components

All sub-components must be used exclusively via dot notation (`Parent.Child`).

- Export using the `Object.assign` pattern:
  ```ts
  export const Select = Object.assign(SelectInnerComponent, {
    Item: SelectItem,
    Header: SelectHeader,
    Action: SelectAction,
    ItemTemplate: SelectItemTemplate,
  });
  ```
- Do not declare separate types or interfaces for compound components (e.g., `SelectComponent`, `TabsComponent`)
- Do not use type assertions on exports (e.g., `as SelectComponent`)
- Do not export sub-components separately (export only the parent)
- UI elements → compound sub-components, non-rendering configuration (state, behavior, callbacks) → props

## Tailwind CSS

- `darkMode: "class"`, `aspectRatio` plugin disabled (Chrome 84)
- Semantic colors: `primary`(blue), `info`(sky), `success`(green), `warning`(amber), `danger`(red), `base`(zinc) → do not use `zinc-*` directly
- Default `rem`, use `em` for text-relative sizes (e.g., Icon)
- `clsx()` for semantic grouping + `twMerge()` for conflict resolution
- Before modifying styles: always Read the existing class patterns in the same component
- **Write class strings inline**: do not extract class strings into separate variables — write them directly in JSX return
- **`*.styles.ts` files**: Tailwind class strings must be wrapped in `clsx()` for IntelliSense support

## Application View Naming (`client-*`)

- `~Sheet` — DataSheet-based list view (e.g., `UserSheet`)
- `~Detail` — single record detail/edit view (e.g., `MyInfoDetail`)
- `~View` — all other views (e.g., `LoginView`, `MainView`)
- Directory: `src/views/` (can be used as standalone pages, embedded components, or modals)
