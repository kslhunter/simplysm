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

const baseClass = clsx("relative", "size-full", "min-h-[70px] min-w-[70px]", "overflow-auto");

// eslint-disable-next-line tailwindcss/enforces-shorthand -- inset is only supported in Chrome 87+
const screenBaseClass = clsx(
  "absolute bottom-0 left-0 right-0 top-0",
  "z-busy",
  "bg-white/70 dark:bg-base-900/70",
  "transition-opacity duration-150",
);

const spinnerClass = clsx(
  "size-8",
  "border-[6px] border-base-200 border-b-primary-500",
  "dark:border-base-700 dark:border-b-primary-400",
  "rounded-full",
  "animate-spin",
  "shadow-md",
  "mx-auto mt-5",
);

const messageClass = clsx("w-full", "text-center font-bold", text.default);

const progressTrackClass = clsx("absolute left-0 top-0", "h-1 w-full", bg.surface);

const progressBarClass = clsx(
  "h-1 w-full",
  "bg-primary-500 dark:bg-primary-400",
  "transition-transform duration-100 ease-in",
  "origin-left",
);

const barIndicatorClass = clsx("absolute left-0 top-0", "h-1 w-full", bg.surface);

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
      screenBaseClass,
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
    <div ref={containerRef} class={twMerge(baseClass, local.class)} {...rest}>
      <Show when={mounted()}>
        <div class={screenClass()} onTransitionEnd={handleTransitionEnd}>
          <div class={rectClass()}>
            <Show when={currVariant() === "spinner"}>
              <div class={spinnerClass} />
            </Show>
            <Show when={currVariant() === "bar" && (local.ready === false || local.busy)}>
              <div data-busy-bar class={barIndicatorClass}>
                <div
                  ref={(el: HTMLElement) => {
                    // Defer to next microtask so the element is inserted into the document first.
                    // el.animate() on a detached element uses a null timeline and won't appear in getAnimations().
                    let anim: Animation;
                    queueMicrotask(() => {
                      // sd-busy-bar-before: scaleX(0) → scaleX(1), 60%에서 완료
                      anim = el.animate(
                        [
                          { transform: "scaleX(0)", offset: 0 },
                          { transform: "scaleX(1)", offset: 0.6 },
                          { transform: "scaleX(1)", offset: 1 },
                        ],
                        { duration: 2000, iterations: Infinity, easing: "ease-in" },
                      );
                    });
                    onCleanup(() => anim?.cancel());
                  }}
                  class={clsx(
                    "absolute left-0 top-0 h-1 w-full origin-left",
                    "bg-primary-500 dark:bg-primary-400",
                  )}
                />
                <div
                  ref={(el: HTMLElement) => {
                    // Defer to next microtask so the element is inserted into the document first.
                    let anim: Animation;
                    queueMicrotask(() => {
                      // sd-busy-bar-after: scaleX(0) → scaleX(1), 50%에서 시작
                      anim = el.animate(
                        [
                          { transform: "scaleX(0)", offset: 0 },
                          { transform: "scaleX(0)", offset: 0.5 },
                          { transform: "scaleX(1)", offset: 1 },
                        ],
                        { duration: 2000, iterations: Infinity, easing: "ease-out" },
                      );
                    });
                    onCleanup(() => anim?.cancel());
                  }}
                  class={clsx(
                    "absolute left-0 top-0 h-1 w-full origin-left",
                    bg.surface,
                  )}
                />
              </div>
            </Show>
            <Show when={local.message}>
              <div class={messageClass}>
                <pre class="m-0">{local.message}</pre>
              </div>
            </Show>
          </div>
          <Show when={local.progressPercent != null}>
            <div class={progressTrackClass}>
              <div
                class={progressBarClass}
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
