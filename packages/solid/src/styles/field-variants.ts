import { twJoin } from "tailwind-merge";
import { tv } from "tailwind-variants";
import { bgTrans, borderTrans, ctrlSizes } from "../constants/mixins";

/**
 * 필드 컴포넌트 공통 스타일 variants
 *
 * slots:
 * - container: 최외곽 컨테이너
 * - input: input/display 요소
 * - display: readonly/disabled 시 표시되는 요소
 */
export const fieldVariants = tv({
  slots: {
    container: twJoin("block", "relative"),
    input: twJoin(
      "w-full",
      "leading-normal",
      "overflow-auto",
      "[&::-webkit-scrollbar]:hidden",
      borderTrans(),
      "rounded",
      "outline-none",
      "focus:border-secondary",
      "placeholder:text-text-muted",
    ),
    display: twJoin(
      "w-full",
      "leading-normal",
      "overflow-auto",
      borderTrans(),
      "rounded",
      "whitespace-pre-wrap",
    ),
  },
  variants: {
    size: ctrlSizes("input", "display"),
    theme: {
      default: {
        input: twJoin(bgTrans().primary, "dark:bg-bg-elevated"),
        display: twJoin(bgTrans().primary, "dark:bg-bg-elevated"),
      },
      ...bgTrans("input", "display"),
    },
    inline: {
      true: {
        container: twJoin("inline-block", "align-top"),
        input: "w-auto",
        display: "w-auto",
      },
    },
    inset: {
      true: {
        container: "h-full",
        input: twJoin(
          "absolute",
          "top-0",
          "left-0",
          "w-full",
          "h-full",
          "border-none",
          "rounded-none",
          "focus:outline",
          "focus:outline-1",
          "focus:outline-primary",
          "focus:-outline-offset-1",
        ),
        display: twJoin("block", "border", "border-transparent", "rounded-none", "h-full"),
      },
    },
    disabled: {
      true: {
        container: twJoin("opacity-50", "pointer-events-none"),
        display: twJoin("bg-disabled-bg", "text-disabled-text"),
      },
    },
    readonly: {
      true: {},
    },
    textAlign: {
      right: {
        input: "text-right",
        display: "text-right",
      },
      center: {
        input: "text-center",
        display: "text-center",
      },
    },
  },
  compoundVariants: [
    // inset + disabled 시 배경 제거
    {
      inset: true,
      disabled: true,
      class: { display: twJoin("bg-transparent", "dark:bg-transparent") },
    },
    {
      inset: false,
      readonly: true,
      class: {
        display: "bg-transparent dark:bg-transparent",
      },
    },
  ],
  defaultVariants: {
    theme: "default",
    size: "default",
  },
});

/**
 * inset 모드에서 타입별 최소 너비
 */
export const fieldInsetWidths = {
  "date": "min-w-[8.25em]",
  "month": "min-w-[8.25em]",
  "year": "min-w-[4em]",
  "datetime": "min-w-[14em]",
  "datetime-sec": "min-w-[14em]",
  "time": "min-w-[8.25em]",
  "time-sec": "min-w-[7em]",
} as const;
