import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const button: import("@vanilla-extract/recipes").RuntimeFn<{
    theme: {
        primary: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        secondary: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        success: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        warning: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        danger: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        info: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        gray: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
        slate: {
            background: string;
            borderColor: string;
            color: string;
            selectors: {
                "&:hover, &:focus-visible": {
                    background: string;
                };
            };
        };
    };
    link: {
        true: {
            background: "transparent";
            borderColor: "transparent";
        };
    };
    inset: {
        true: {
            border: "none";
            borderRadius: number;
        };
    };
    size: {
        xs: {
            padding: `var(--${string}) var(--${string})`;
            fontSize: `var(--${string})`;
        };
        sm: {
            padding: `var(--${string}) var(--${string})`;
        };
        base: {};
        lg: {
            padding: `var(--${string}) var(--${string})`;
        };
        xl: {
            padding: `var(--${string}) var(--${string})`;
            fontSize: `var(--${string})`;
        };
    };
}>;
export type ButtonStyles = NonNullable<RecipeVariants<typeof button>>;
//# sourceMappingURL=button.css.d.ts.map