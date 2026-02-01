import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { vars } from "@simplysm/solid/styles";

export const collapseIcon = recipe({
  base: {
    display: "inline-flex",
    transition: `transform ${vars.duration.base} linear`,
  },
});

export type CollapseIconStyles = NonNullable<RecipeVariants<typeof collapseIcon>>;
