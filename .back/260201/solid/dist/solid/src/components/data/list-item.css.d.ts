import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const listItem: string;
export declare const listItemContent: import("@vanilla-extract/recipes").RuntimeFn<{
  layout: {
    accordion: {
      selectors: {
        "&:hover, &:focus-visible": {
          background: `rgba(var(--${string}), var(--${string}))`;
        };
      };
    };
    flat: {};
  };
  selected: {
    true: {
      background: `rgba(var(--${string}), var(--${string}))`;
      color: `rgb(var(--${string}))`;
      fontWeight: "bold";
    };
  };
  disabled: {
    true: {
      cursor: "default";
      pointerEvents: "none";
      opacity: `var(--${string})`;
    };
  };
  hasSelectedIcon: {
    true: {};
  };
  hasChildren: {
    true: {};
  };
}>;
export type ListItemContentStyles = NonNullable<RecipeVariants<typeof listItemContent>>;
//# sourceMappingURL=list-item.css.d.ts.map
