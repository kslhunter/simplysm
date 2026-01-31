import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { booleanTransitionCss } from "../../styles/mixins/boolean-transition.css";

export const collapse = recipe({
  base: {
    overflow: "hidden",
    transitionProperty: "height",
  },
  variants: {
    open: booleanTransitionCss,
  },
});

export type CollapseStyles = NonNullable<RecipeVariants<typeof collapse>>;
