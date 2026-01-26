import { type JSX, mergeProps, type ParentProps, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { tv, type VariantProps } from "tailwind-variants";
import { ripple } from "../directives/ripple";

// 공통 disabled 스타일 상수
const filledDisabled = "disabled:bg-disabled-bg disabled:border-disabled-border disabled:text-disabled-text";
const linkDisabled = "disabled:bg-transparent disabled:border-transparent disabled:text-disabled-text";

/**
 * 버튼 스타일 variants
 *
 * @remarks
 * 다양한 요소에 버튼 스타일을 적용할 수 있다.
 *
 * @example
 * // Router Link에 버튼 스타일 적용
 * <A class={buttonVariants({ theme: "primary", size: "lg" })} href="/page">링크</A>
 */
export const buttonVariants = tv({
  base: twJoin(
    "inline-flex",
    "items-center",
    "justify-center",
    "border",
    "rounded-sm",
    "font-semibold",
    "text-base",
    "cursor-pointer",
    "select-none",
    "transition-colors",
    "duration-100",
    "disabled:cursor-not-allowed",
  ),
  variants: {
    theme: {
      // filled 스타일: default는 시맨틱 배경+테두리, 나머지는 테마 색상 배경+동일 테두리
      "default": twJoin(
        "bg-bg-base",
        "border-border-base",
        "text-text-base",
        "hover:bg-bg-hover",
        "disabled:bg-bg-base",
        "disabled:border-border-base",
        "disabled:text-text-muted",
      ),
      "primary": twJoin(
        "bg-primary",
        "border-primary",
        "text-white",
        "hover:bg-primary-dark",
        filledDisabled,
      ),
      "secondary": twJoin(
        "bg-secondary",
        "border-secondary",
        "text-white",
        "hover:bg-secondary-dark",
        filledDisabled,
      ),
      "info": twJoin(
        "bg-info",
        "border-info",
        "text-white",
        "hover:bg-info-dark",
        filledDisabled,
      ),
      "success": twJoin(
        "bg-success",
        "border-success",
        "text-white",
        "hover:bg-success-dark",
        filledDisabled,
      ),
      "warning": twJoin(
        "bg-warning",
        "border-warning",
        "text-white",
        "hover:bg-warning-dark",
        filledDisabled,
      ),
      "danger": twJoin(
        "bg-danger",
        "border-danger",
        "text-white",
        "hover:bg-danger-dark",
        filledDisabled,
      ),
      "gray": twJoin(
        "bg-gray",
        "border-gray",
        "text-white",
        "hover:bg-gray-dark",
        filledDisabled,
      ),
      "slate": twJoin(
        "bg-slate",
        "border-slate",
        "text-white",
        "hover:bg-slate-dark",
        filledDisabled,
      ),
      // link 스타일: 투명 배경, 텍스트 색상만 테마 색상 적용
      "link-primary": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-primary",
        "hover:bg-bg-hover",
        "hover:text-text-primary-hover",
        linkDisabled,
      ),
      "link-secondary": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-secondary",
        "hover:bg-bg-hover",
        "hover:text-text-secondary-hover",
        linkDisabled,
      ),
      "link-info": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-info",
        "hover:bg-bg-hover",
        "hover:text-text-info-hover",
        linkDisabled,
      ),
      "link-success": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-success",
        "hover:bg-bg-hover",
        "hover:text-text-success-hover",
        linkDisabled,
      ),
      "link-warning": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-warning",
        "hover:bg-bg-hover",
        "hover:text-text-warning-hover",
        linkDisabled,
      ),
      "link-danger": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-danger",
        "hover:bg-bg-hover",
        "hover:text-text-danger-hover",
        linkDisabled,
      ),
      "link-gray": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-gray",
        "hover:bg-bg-hover",
        "hover:text-text-gray-hover",
        linkDisabled,
      ),
      "link-slate": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-slate",
        "hover:bg-bg-hover",
        "hover:text-text-slate-hover",
        linkDisabled,
      ),
    },
    size: {
      xs: twJoin("px-ctrl-xs", "py-ctrl-xxs", "text-xs"),
      sm: twJoin("px-ctrl-sm", "py-ctrl-xs"),
      default: twJoin("px-ctrl", "py-ctrl-sm"),
      lg: twJoin("px-ctrl-lg", "py-ctrl"),
      xl: twJoin("px-ctrl-xl", "py-ctrl-lg", "text-lg"),
    },
    inset: {
      true: twJoin("rounded-none", "border-none"),
    },
  },
  defaultVariants: {
    theme: "default",
    size: "default",
  },
});

/**
 * buttonVariants의 variant props 타입
 */
export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/**
 * SdButton 컴포넌트의 Props 타입
 *
 * @remarks
 * - `theme` - 버튼 색상 테마 (default, primary, secondary 등). link-* 계열은 투명 배경
 * - `size` - 버튼 크기 (default, sm, lg)
 * - `inset` - 부모 요소에 삽입되는 형태. true일 때 테두리/라운드 제거
 */
export interface SdButtonProps
  extends
    ParentProps,
    Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {}

/**
 * 버튼 컴포넌트
 *
 * @remarks
 * `inset` 속성이 true이고 `theme`이 지정되지 않은 경우,
 * 자동으로 `"link-primary"` 테마가 적용된다.
 */
export function SdButton(props: SdButtonProps) {
  const merged = mergeProps({ type: "button" as const }, props);
  const [local, rest] = splitProps(merged, ["theme", "size", "inset", "class", "children"]);

  /**
   * inset 버튼은 부모 컨테이너 내부에 삽입되어 사용되므로,
   * 배경이 투명한 link 스타일이 시각적으로 더 자연스럽다.
   * 명시적으로 theme을 지정한 경우에는 그대로 사용한다.
   */
  const effectiveTheme = () => {
    if (local.inset && (local.theme ?? "default") === "default") {
      return "link-primary" as const;
    }
    return local.theme;
  };

  return (
    <button
      use:ripple={!rest.disabled}
      class={buttonVariants({
        theme: effectiveTheme(),
        size: local.size,
        inset: local.inset,
        class: local.class,
      })}
      {...rest}
    >
      {local.children}
    </button>
  );
}
