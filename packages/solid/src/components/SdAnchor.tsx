import { twJoin } from "tailwind-merge";
import { tv, type VariantProps } from "tailwind-variants";

/**
 * 앵커(링크) 스타일 variants
 *
 * @remarks
 * 다양한 요소에 링크 스타일을 적용할 수 있다.
 *
 * @example
 * // 실제 <a> 태그에 적용
 * <a class={anchorVariants({ theme: "primary" })} href="/page">링크</a>
 *
 * // <button>에 링크 스타일 적용
 * <button class={anchorVariants({ theme: "danger" })} onClick={...}>클릭</button>
 *
 * // disabled 상태
 * <span class={anchorVariants({ theme: "primary", disabled: true })}>비활성</span>
 */
export const anchorVariants = tv({
  base: twJoin("inline", "cursor-pointer", "transition-colors", "duration-100"),
  variants: {
    theme: {
      primary: twJoin(
        "text-primary",
        "hover:text-text-primary-hover",
        "hover:underline",
        "active:text-primary",
      ),
      secondary: twJoin(
        "text-secondary",
        "hover:text-text-secondary-hover",
        "hover:underline",
        "active:text-secondary",
      ),
      info: twJoin(
        "text-info",
        "hover:text-text-info-hover",
        "hover:underline",
        "active:text-info",
      ),
      success: twJoin(
        "text-success",
        "hover:text-text-success-hover",
        "hover:underline",
        "active:text-success",
      ),
      warning: twJoin(
        "text-warning",
        "hover:text-text-warning-hover",
        "hover:underline",
        "active:text-warning",
      ),
      danger: twJoin(
        "text-danger",
        "hover:text-text-danger-hover",
        "hover:underline",
        "active:text-danger",
      ),
      gray: twJoin(
        "text-gray",
        "hover:text-text-gray-hover",
        "hover:underline",
        "active:text-gray",
      ),
      slate: twJoin(
        "text-slate",
        "hover:text-text-slate-hover",
        "hover:underline",
        "active:text-slate",
      ),
    },
    disabled: {
      true: twJoin("opacity-30", "pointer-events-none", "cursor-not-allowed"),
    },
  },
  defaultVariants: {
    theme: "primary",
    disabled: false,
  },
});

/**
 * anchorVariants의 variant props 타입
 */
export type AnchorVariantProps = VariantProps<typeof anchorVariants>;
