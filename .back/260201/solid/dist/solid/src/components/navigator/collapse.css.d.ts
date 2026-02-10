import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const collapse: import("@vanilla-extract/recipes").RuntimeFn<{
  open: {
    readonly true: {
      readonly transition: `var(--${string}) ease-out`;
    };
    readonly false: {
      readonly transition: `var(--${string}) ease-in`;
    };
  };
}>;
export type CollapseStyles = NonNullable<RecipeVariants<typeof collapse>>;
//# sourceMappingURL=collapse.css.d.ts.map
