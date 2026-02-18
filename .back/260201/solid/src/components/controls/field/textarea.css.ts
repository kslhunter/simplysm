import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import {
  fieldBaseStyles,
  fieldBaseSelectors,
  fieldBaseVariants,
  fieldHeight,
} from "./field-base.css";

/**
 * Textarea 스타일 recipe
 * field-base 스타일을 확장하되 re-export하지 않고 직접 정의
 */
export const textarea = recipe({
  base: {
    ...fieldBaseStyles,
    height: "auto",
    minHeight: fieldHeight.base,
    resize: "vertical",
    overflow: "auto",
    selectors: fieldBaseSelectors,
  },
  variants: {
    size: {
      sm: {
        ...fieldBaseVariants.size.sm,
        minHeight: fieldHeight.sm,
      },
      lg: {
        ...fieldBaseVariants.size.lg,
        minHeight: fieldHeight.lg,
      },
    },
    inset: fieldBaseVariants.inset,
    autoResize: {
      true: {
        resize: "none",
        overflow: "hidden",
      },
    },
    resize: {
      none: { resize: "none" },
      vertical: { resize: "vertical" },
      horizontal: { resize: "horizontal" },
      both: { resize: "both" },
    },
  },
  compoundVariants: [
    // autoResize가 true이면 resize 설정을 무시하고 none으로 강제
    {
      variants: { autoResize: true },
      style: { resize: "none" },
    },
  ],
  defaultVariants: {},
});

export type TextareaStyles = NonNullable<RecipeVariants<typeof textarea>>;
