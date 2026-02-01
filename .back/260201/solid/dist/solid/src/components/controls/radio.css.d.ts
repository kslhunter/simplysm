import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const radioIndicator: string;
export declare const radioInnerDot: string;
export declare const radioContents: string;
export declare const radio: import("@vanilla-extract/recipes").RuntimeFn<{
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
export type RadioStyles = NonNullable<RecipeVariants<typeof radio>>;
//# sourceMappingURL=radio.css.d.ts.map