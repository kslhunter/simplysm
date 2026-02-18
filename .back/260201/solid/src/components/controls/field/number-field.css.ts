import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import {
  fieldBaseStyles,
  fieldBaseSelectors,
  fieldBaseVariants,
  fieldContainer,
  fieldContent,
  fieldInput,
} from "./field-base.css";

export {
  fieldContainer as numberFieldContainer,
  fieldContent as numberFieldContent,
  fieldInput as numberFieldInput,
};

/**
 * NumberField 스타일 (fieldBase 확장 - textAlign: right, 스피너 숨김)
 */
export const numberField = recipe({
  base: {
    ...fieldBaseStyles,
    textAlign: "right",
    MozAppearance: "textfield",
    selectors: {
      ...fieldBaseSelectors,
      "&::-webkit-outer-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
      },
      "&::-webkit-inner-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
      },
    },
  },
  variants: fieldBaseVariants,
  defaultVariants: {},
});

export type NumberFieldStyles = NonNullable<RecipeVariants<typeof numberField>>;
