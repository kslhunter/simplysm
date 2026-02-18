import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { tokenVars } from "../../../styles/variables/token.css";
import {
  fieldBaseStyles,
  fieldBaseSelectors,
  fieldBaseVariants,
  fieldContainer,
  fieldContent,
  fieldInput,
} from "./field-base.css";

export {
  fieldContainer as colorFieldContainer,
  fieldContent as colorFieldContent,
  fieldInput as colorFieldInput,
};

/**
 * ColorField 스타일 (fieldBase 확장 - cursor: pointer, color swatch 스타일)
 */
export const colorField = recipe({
  base: {
    ...fieldBaseStyles,
    cursor: "pointer",
    selectors: {
      ...fieldBaseSelectors,
      "&::-webkit-color-swatch-wrapper": {
        padding: 0,
      },
      "&::-webkit-color-swatch": {
        border: "none",
        borderRadius: tokenVars.radius.sm,
      },
      "&::-moz-color-swatch": {
        border: "none",
        borderRadius: tokenVars.radius.sm,
      },
    },
  },
  variants: {
    ...fieldBaseVariants,
    inline: {
      true: {
        display: "inline-block",
        width: "auto",
        minWidth: "3rem",
      },
    },
  },
  defaultVariants: {},
});

export type ColorFieldStyles = NonNullable<RecipeVariants<typeof colorField>>;
