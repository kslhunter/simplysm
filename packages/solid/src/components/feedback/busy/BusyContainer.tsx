import {
  type ParentComponent,
  type JSX,
  splitProps,
  createSignal,
  createEffect,
  onCleanup,
  Show,
  useContext,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { BusyContext, type BusyType } from "./BusyContext";

export interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  busy?: boolean;
  type?: BusyType;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}

const baseClass = clsx(
  "relative",
  "size-full",
  "min-h-[70px] min-w-[70px]",
  "overflow-auto",
);

// eslint-disable-next-line tailwindcss/enforces-shorthand -- inset은 Chrome 87+에서만 지원
const screenBaseClass = clsx(
  "absolute bottom-0 left-0 right-0 top-0",
  "z-busy",
  "transition-opacity duration-150",
);

const spinnerClass = clsx(
  "size-8",
  "border-[6px] border-white border-b-primary-500",
  "dark:border-base-800 dark:border-b-primary-400",
  "rounded-full",
  "animate-spin",
  "shadow-md",
  "mx-auto mt-5",
);

const messageClass = clsx(
  "w-full",
  "text-center font-bold",
  "text-white dark:text-base-200",
);

const progressTrackClass = clsx(
  "absolute left-0 top-0",
  "h-1 w-full",
  "bg-white dark:bg-base-800",
);

const progressBarClass = clsx(
  "h-1 w-full",
  "bg-primary-500 dark:bg-primary-400",
  "transition-transform duration-100 ease-in",
  "origin-left",
);

const barIndicatorClass = clsx(
  "absolute left-0 top-0",
  "h-1 w-full",
  "bg-white dark:bg-base-800",
);

export const BusyContainer: ParentComponent<BusyContainerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "busy", "type", "message", "progressPercent", "class", "children",
  ]);

  const busyCtx = useContext(BusyContext);
  const currType = (): BusyType => local.type ?? busyCtx?.type() ?? "spinner";

  // 애니메이션 상태 (Dropdown 패턴)
  const [mounted, setMounted] = createSignal(false);
  const [animating, setAnimating] = createSignal(false);

  createEffect(() => {
    if (local.busy) {
      setMounted(true);
      let rafId1: number;
      let rafId2: number;
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      onCleanup(() => {
        cancelAnimationFrame(rafId1);
        cancelAnimationFrame(rafId2);
      });
    } else if (mounted()) {
      setAnimating(false);
      const fallbackTimer = setTimeout(() => {
        if (!local.busy) setMounted(false);
      }, 200);
      onCleanup(() => clearTimeout(fallbackTimer));
    }
  });

  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName !== "opacity") return;
    if (!local.busy) {
      setMounted(false);
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
    clsx(
      screenBaseClass,
      animating()
        ? "pointer-events-auto opacity-100"
        : "pointer-events-none opacity-0",
    );

  // spinner: 슬라이드 다운 애니메이션
  const rectClass = () => {
    if (currType() !== "spinner") return "";
    return clsx(
      "transition-transform duration-100",
      animating()
        ? "translate-y-0 ease-out"
        : "-translate-y-full ease-in",
    );
  };

  return (
    <div
      ref={containerRef}
      class={twMerge(baseClass, local.class)}
      {...rest}
    >
      <Show when={mounted()}>
        <div class={screenClass()} onTransitionEnd={handleTransitionEnd}>
          <div class={rectClass()}>
            <Show when={currType() === "spinner"}>
              <div class={spinnerClass} />
            </Show>
            <Show when={currType() === "bar" && local.busy}>
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
              <div
                class={progressBarClass}
                style={{ transform: `scaleX(${(local.progressPercent ?? 0) / 100})` }}
              />
            </div>
          </Show>
        </div>
      </Show>
      {local.children}
    </div>
  );
};
