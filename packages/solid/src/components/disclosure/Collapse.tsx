import {
  type JSX,
  type ParentComponent,
  splitProps,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { createElementSize } from "@solid-primitives/resize-observer";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { mergeStyles } from "../../helpers/mergeStyles";

export interface CollapseProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show content. Default: false (closed)
   *
   * Accessibility note:
   * - Use `aria-expanded` and `aria-controls` on the toggle button.
   * - If using the `Button` component, Enter/Space keyboard accessibility is automatically supported.
   *
   * @example
   * ```tsx
   * <Button aria-expanded={open()} aria-controls="content" onClick={() => setOpen(!open())}>
   *   Toggle
   * </Button>
   * <Collapse id="content" open={open()}>Content</Collapse>
   * ```
   */
  open?: boolean;
}

const transitionClass = clsx(
  "transition-[margin-top]",
  "duration-200",
  "ease-out",
  "motion-reduce:transition-none",
);

export const Collapse: ParentComponent<CollapseProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style", "open"]);

  // Content element ref
  const [contentRef, setContentRef] = createSignal<HTMLDivElement>();

  // Track content height
  const size = createElementSize(contentRef);

  // Disable transition on initial render (prevent flickering)
  // Enable it on the next frame via requestAnimationFrame
  const [mounted, setMounted] = createSignal(false);
  onMount(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    onCleanup(() => cancelAnimationFrame(rafId));
  });

  // Treat undefined open as false
  const isOpen = () => local.open ?? false;

  // Calculate margin-top
  const marginTop = () => (isOpen() ? undefined : `${-(size.height ?? 0)}px`);

  return (
    <div
      {...rest}
      data-collapse
      class={twMerge("block", local.class)}
      style={mergeStyles(local.style, { overflow: "hidden" })}
    >
      <div
        ref={setContentRef}
        class={mounted() ? transitionClass : ""}
        style={{
          "margin-top": marginTop(),
          // When closed, prevent access to focusable elements and prevent FOUC
          "visibility": !isOpen() ? "hidden" : undefined,
        }}
      >
        {local.children}
      </div>
    </div>
  );
};
