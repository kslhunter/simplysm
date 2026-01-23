import { type JSX, mergeProps, type ParentProps, splitProps } from "solid-js";
import { twJoin } from "tailwind-merge";
import { tv, type VariantProps } from "tailwind-variants";
import { ripple } from "../directives/ripple";

// directive 등록 (tree-shaking 방지)
ripple;

// 공통 disabled 스타일 상수
const filledDisabled = "disabled:bg-disabled-bg disabled:border-disabled-border disabled:text-disabled-text";
const linkDisabled = "disabled:bg-transparent disabled:border-transparent disabled:text-disabled-text";

// tailwind-variants로 버튼 스타일 정의
const buttonVariants = tv({
  base: twJoin(
    "inline-flex",
    "items-center",
    "justify-center",
    "border",
    "rounded",
    "font-semibold",
    "text-sm",
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
      "blue-gray": twJoin(
        "bg-blue-gray",
        "border-blue-gray",
        "text-white",
        "hover:bg-blue-gray-dark",
        filledDisabled,
      ),
      // link 스타일: 투명 배경, 텍스트 색상만 테마 색상 적용
      "link-primary": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-primary",
        "hover:bg-bg-hover",
        "hover:text-primary-text-hover",
        linkDisabled,
      ),
      "link-secondary": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-secondary",
        "hover:bg-bg-hover",
        "hover:text-secondary-text-hover",
        linkDisabled,
      ),
      "link-info": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-info",
        "hover:bg-bg-hover",
        "hover:text-info-text-hover",
        linkDisabled,
      ),
      "link-success": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-success",
        "hover:bg-bg-hover",
        "hover:text-success-text-hover",
        linkDisabled,
      ),
      "link-warning": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-warning",
        "hover:bg-bg-hover",
        "hover:text-warning-text-hover",
        linkDisabled,
      ),
      "link-danger": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-danger",
        "hover:bg-bg-hover",
        "hover:text-danger-text-hover",
        linkDisabled,
      ),
      "link-gray": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-gray",
        "hover:bg-bg-hover",
        "hover:text-gray-text-hover",
        linkDisabled,
      ),
      "link-blue-gray": twJoin(
        "border-transparent",
        "bg-transparent",
        "text-blue-gray",
        "hover:bg-bg-hover",
        "hover:text-blue-gray-text-hover",
        linkDisabled,
      ),
    },
    size: {
      default: twJoin("px-3", "py-1.5"),
      sm: twJoin("px-2", "py-1", "text-xs"),
      lg: twJoin("px-4", "py-2", "text-base"),
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
    if (local.inset && (local.theme == null || local.theme === "default")) {
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
