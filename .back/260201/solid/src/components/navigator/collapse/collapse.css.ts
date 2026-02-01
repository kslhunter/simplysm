import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { vars } from "@simplysm/solid/styles";

export const collapse = recipe({
  base: {
    overflow: "hidden",
    transitionProperty: `height ${vars.duration.base} linear`,
  },
});

export type CollapseStyles = NonNullable<RecipeVariants<typeof collapse>>;
