import { type RecipeVariants } from "@vanilla-extract/recipes";
export declare const dropdownPopup: import("@vanilla-extract/recipes").RuntimeFn<{
    placement: {
        bottom: {
            animation: `${string} var(--${string}) ease-out`;
        };
        top: {
            animation: `${string} var(--${string}) ease-out`;
        };
    };
    mobile: {
        true: {
            position: "fixed";
            left: "0 !important";
            right: "0 !important";
            bottom: "0 !important";
            top: "auto !important";
            width: "100%";
            maxHeight: "80vh";
            borderRadius: `var(--${string}) var(--${string}) 0 0`;
            animation: `${string} var(--${string}) ease-out`;
        };
    };
}>;
export declare const dropdownPopupContent: string;
export declare const backdrop: string;
export declare const mobileHandle: string;
export type DropdownPopupStyles = NonNullable<RecipeVariants<typeof dropdownPopup>>;
//# sourceMappingURL=dropdown-popup.css.d.ts.map