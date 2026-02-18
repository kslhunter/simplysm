import { type ParentComponent, type JSX, splitProps, createEffect, onCleanup, Show, useContext } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { BusyContext, type BusyVariant } from "./BusyContext";
import { createMountTransition } from "../../../hooks/createMountTransition";
import "./BusyContainer.css";

export interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}

const baseClass = clsx("relative", "size-full", "min-h-[70px] min-w-[70px]", "overflow-auto");

// eslint-disable-next-line tailwindcss/enforces-shorthand -- inset은 Chrome 87+에서만 지원
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

const messageClass = clsx("w-full", "text-center font-bold", "text-base-700 dark:text-base-200");

const progressTrackClass = clsx("absolute left-0 top-0", "h-1 w-full", "bg-white dark:bg-base-800");

const progressBarClass = clsx(
  "h-1 w-full",
  "bg-primary-500 dark:bg-primary-400",
  "transition-transform duration-100 ease-in",
  "origin-left",
);

const barIndicatorClass = clsx("absolute left-0 top-0", "h-1 w-full", "bg-white dark:bg-base-800");

export const BusyContainer: ParentComponent<BusyContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["busy", "variant", "message", "progressPercent", "class", "children"]);

  const busyCtx = useContext(BusyContext);
  const currVariant = (): BusyVariant => local.variant ?? busyCtx?.variant() ?? "spinner";

  // 애니메이션 상태 (mount transition)
  const { mounted, animating, unmount } = createMountTransition(() => !!local.busy);

  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName !== "opacity") return;
    if (!local.busy) {
      unmount();
    }
  };

  // 키보드 입력 차단 (캡처 단계)
  let containerRef!: HTMLDivElement;

  createEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (local.busy) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    containerRef.addEventListener("keydown", handleKeyDownCapture, { capture: true });
    onCleanup(() => containerRef.removeEventListener("keydown", handleKeyDownCapture, { capture: true }));
  });

  const screenClass = () =>
    clsx(screenBaseClass, animating() ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0");

  // spinner: 슬라이드 다운 애니메이션
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
            <Show when={currVariant() === "bar" && local.busy}>
              <div class={barIndicatorClass}>
                <div
                  class={clsx("absolute left-0 top-0 h-1 w-full origin-left", "bg-primary-500 dark:bg-primary-400")}
                  style={{
                    animation: "sd-busy-bar-before 2s infinite ease-in",
                  }}
                />
                <div
                  class={clsx("absolute left-0 top-0 h-1 w-full origin-left", "bg-white dark:bg-base-800")}
                  style={{
                    animation: "sd-busy-bar-after 2s infinite ease-out",
                  }}
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
              <div class={progressBarClass} style={{ transform: `scaleX(${(local.progressPercent ?? 0) / 100})` }} />
            </div>
          </Show>
        </div>
      </Show>
      {local.children}
    </div>
  );
};
