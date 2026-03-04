import {
  type ParentComponent,
  type JSX,
  splitProps,
  createEffect,
  onCleanup,
  Show,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { bg, text } from "../../../styles/base.styles";
import { useBusy, type BusyVariant } from "./BusyProvider";
import { createMountTransition } from "../../../hooks/createMountTransition";
import "./BusyContainer.animate.css";

export interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Show loading overlay (children are preserved) */
  busy?: boolean;
  /** If false, children are hidden and loading overlay is shown. Used for initial data loading */
  ready?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}

export const BusyContainer: ParentComponent<BusyContainerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "busy",
    "ready",
    "variant",
    "message",
    "progressPercent",
    "class",
    "children",
  ]);

  let busyCtx: ReturnType<typeof useBusy> | undefined;
  try {
    busyCtx = useBusy();
  } catch {
    // Not inside BusyProvider
  }
  const currVariant = (): BusyVariant => local.variant ?? busyCtx?.variant() ?? "spinner";

  // Animation state (mount transition)
  const { mounted, animating, unmount } = createMountTransition(
    () => local.ready === false || !!local.busy,
  );

  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName !== "opacity") return;
    if (local.ready !== false && !local.busy) {
      unmount();
    }
  };

  // Block keyboard input (capture phase)
  let containerRef!: HTMLDivElement;

  createEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (local.ready === false || local.busy) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    containerRef.addEventListener("keydown", handleKeyDownCapture, { capture: true });
    onCleanup(() =>
      containerRef.removeEventListener("keydown", handleKeyDownCapture, { capture: true }),
    );
  });

   
  const screenClass = () =>
    clsx(
      "absolute inset-0 z-busy bg-white/70 transition-opacity duration-150 dark:bg-base-900/70",
      animating() ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
    );

  // spinner: slide down animation
  const rectClass = () => {
    if (currVariant() !== "spinner") return "";
    return clsx(
      "transition-transform duration-100",
      animating() ? "translate-y-0 ease-out" : "-translate-y-full ease-in",
    );
  };

  return (
    <div ref={containerRef} class={twMerge("relative size-full min-h-[70px] min-w-[70px] overflow-auto", local.class)} {...rest}>
      <Show when={mounted()}>
        <div class={screenClass()} onTransitionEnd={handleTransitionEnd}>
          <div class={rectClass()}>
            <Show when={currVariant() === "spinner"}>
              <div class="mx-auto mt-5 size-8 animate-spin rounded-full border-[6px] border-base-200 border-b-primary-500 shadow-md dark:border-base-700 dark:border-b-primary-400" />
            </Show>
            <Show when={currVariant() === "bar" && (local.ready === false || local.busy)}>
              <div class={clsx("absolute left-0 top-0 h-1 w-full", bg.surface)}>
                <div
                  class={clsx(
                    "absolute left-0 top-0 h-1 w-full origin-left",
                    "bg-primary-500 dark:bg-primary-400",
                  )}
                  style={{
                    animation: "sd-busy-bar-before 2s infinite ease-in",
                  }}
                />
                <div
                  class={clsx(
                    "absolute left-0 top-0 h-1 w-full origin-left",
                    bg.surface,
                  )}
                  style={{
                    animation: "sd-busy-bar-after 2s infinite ease-out",
                  }}
                />
              </div>
            </Show>
            <Show when={local.message}>
              <div class={clsx("w-full text-center font-bold", text.default)}>
                <pre class="m-0">{local.message}</pre>
              </div>
            </Show>
          </div>
          <Show when={local.progressPercent != null}>
            <div class={clsx("absolute left-0 top-0 h-1 w-full", bg.surface)}>
              <div
                class="h-1 w-full origin-left bg-primary-500 transition-transform duration-100 ease-in dark:bg-primary-400"
                style={{ transform: `scaleX(${(local.progressPercent ?? 0) / 100})` }}
              />
            </div>
          </Show>
        </div>
      </Show>
      <Show when={local.ready !== false}>{local.children}</Show>
    </div>
  );
};
