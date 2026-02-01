import { recipe } from "@vanilla-extract/recipes";
import { tokenVars } from "../../styles/variables/token.css";
import {
  fieldBaseStyles,
  fieldBaseSelectors,
  fieldBaseVariants,
  fieldContainer,
  fieldContent,
  fieldInput
} from "./field-base.css";
const colorField = recipe({
  base: {
    ...fieldBaseStyles,
    cursor: "pointer",
    selectors: {
      ...fieldBaseSelectors,
      "&::-webkit-color-swatch-wrapper": {
        padding: 0
      },
      "&::-webkit-color-swatch": {
        border: "none",
        borderRadius: tokenVars.radius.sm
      },
      "&::-moz-color-swatch": {
        border: "none",
        borderRadius: tokenVars.radius.sm
      }
    }
  },
  variants: {
    ...fieldBaseVariants,
    inline: {
      true: {
        display: "inline-block",
        width: "auto",
        minWidth: "3rem"
      }
    }
  },
  defaultVariants: {}
});
export {
  colorField,
  fieldContainer as colorFieldContainer,
  fieldContent as colorFieldContent,
  fieldInput as colorFieldInput
};
//# sourceMappingURL=color-field.css.js.map
