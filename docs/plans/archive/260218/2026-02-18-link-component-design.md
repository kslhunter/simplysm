# Link Component Design

## Overview

A simple inline text link component wrapping the `<a>` tag for the `@simplysm/solid` package.

## Decisions

| Topic | Decision |
|-------|----------|
| Purpose | Inline text links within paragraphs |
| HTML element | `<a>` tag |
| Router integration | None — pure href only |
| Style variants | Single style only (primary color) |
| Underline behavior | Hover only |

## File Location

`packages/solid/src/components/display/Link.tsx` — categorized under display as an inline text display element.

## Props

```typescript
export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {}
```

No additional props — uses native `<a>` attributes only.

## Styling

- Text color: `text-primary-600` (light) / `text-primary-400` (dark)
- Underline: hover only (`hover:underline`)
- Cursor: pointer

## Implementation

```tsx
import { type JSX, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {}

export function Link(props: LinkProps) {
  const [, rest] = splitProps(props, ["class"]);

  const baseClass = clsx(
    "text-primary-600",
    "dark:text-primary-400",
    "hover:underline",
    "cursor-pointer",
  );

  return <a {...rest} class={twMerge(baseClass, props.class)} />;
}
```

## Export

Add to `packages/solid/src/index.ts` in the Display section:

```typescript
export * from "./components/display/Link";
```

## Scope

- Create `Link.tsx` component
- Export from `index.ts`
- Add test
- Add demo page
- Update README.md
