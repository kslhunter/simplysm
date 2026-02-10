import { recipe } from "@vanilla-extract/recipes";
import {
  fieldBaseStyles,
  fieldBaseSelectors,
  fieldBaseVariants,
  fieldContainer,
  fieldContent,
  fieldInput,
} from "./field-base.css";
const numberField = recipe({
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
export {
  numberField,
  fieldContainer as numberFieldContainer,
  fieldContent as numberFieldContent,
  fieldInput as numberFieldInput,
};
//# sourceMappingURL=number-field.css.js.map
