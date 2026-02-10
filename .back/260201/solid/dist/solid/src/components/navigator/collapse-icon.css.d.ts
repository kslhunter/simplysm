import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const collapseIcon: import("@vanilla-extract/recipes").RuntimeFn<{
  open: {
    readonly true: {
      readonly transition: `var(--${string}) ease-out`;
    };
    readonly false: {
      readonly transition: `var(--${string}) ease-in`;
    };
  };
}>;
export type CollapseIconStyles = NonNullable<RecipeVariants<typeof collapseIcon>>;
//# sourceMappingURL=collapse-icon.css.d.ts.map
