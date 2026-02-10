import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const checkboxIndicator: string;
export declare const checkboxIndicatorIcon: string;
export declare const checkboxContents: string;
export declare const checkbox: import("@vanilla-extract/recipes").RuntimeFn<{
  theme: {
    primary: {};
    secondary: {};
    success: {};
    warning: {};
    danger: {};
    info: {};
    gray: {};
    slate: {};
  };
  checked: {
    true: {};
    false: {};
  };
  indeterminate: {
    true: {};
    false: {};
  };
  size: {
    xs: {
      fontSize: `var(--${string})`;
      padding: `var(--${string}) var(--${string})`;
    };
    sm: {
      padding: `var(--${string}) var(--${string})`;
    };
    lg: {
      padding: `var(--${string}) var(--${string})`;
    };
    xl: {
      fontSize: `var(--${string})`;
      padding: `var(--${string}) var(--${string})`;
    };
  };
  inline: {
    true: {
      verticalAlign: "middle";
      padding: number;
      border: "none";
    };
  };
  inset: {
    true: {
      border: "none";
      borderRadius: number;
      justifyContent: "center";
    };
  };
  disabled: {
    true: {
      opacity: `var(--${string})`;
      pointerEvents: "none";
      cursor: "default";
    };
  };
}>;
export type CheckboxStyles = NonNullable<RecipeVariants<typeof checkbox>>;
//# sourceMappingURL=checkbox.css.d.ts.map
