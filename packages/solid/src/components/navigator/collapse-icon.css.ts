import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { booleanTransitionCss } from "../../styles/mixins/boolean-transition.css";

export const collapseIcon = recipe({
  base: {
    display: "inline-block",
    transitionProperty: "transform",
  },
  variants: {
    open: booleanTransitionCss,
  },
});

export type CollapseIconStyles = NonNullable<RecipeVariants<typeof collapseIcon>>;
