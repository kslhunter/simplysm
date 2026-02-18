import { type RecipeVariants } from "@vanilla-extract/recipes";
import { fieldContainer, fieldContent, fieldInput } from "./field-base.css";
export {
  fieldContainer as colorFieldContainer,
  fieldContent as colorFieldContent,
  fieldInput as colorFieldInput,
};
/**
 * ColorField 스타일 (fieldBase 확장 - cursor: pointer, color swatch 스타일)
 */
export declare const colorField: import("@vanilla-extract/recipes").RuntimeFn<{
  inline: {
    true: {
      display: "inline-block";
      width: "auto";
      minWidth: "3rem";
    };
  };
  size: {
    readonly sm: {
      readonly height: string;
      readonly padding: `var(--${string}) var(--${string})`;
      readonly fontSize: `var(--${string})`;
    };
    readonly lg: {
      readonly height: string;
      readonly padding: `var(--${string}) var(--${string})`;
      readonly fontSize: `var(--${string})`;
    };
  };
  inset: {
    readonly true: {
      readonly border: "none";
      readonly borderRadius: 0;
      readonly background: "transparent";
    };
  };
}>;
export type ColorFieldStyles = NonNullable<RecipeVariants<typeof colorField>>;
//# sourceMappingURL=color-field.css.d.ts.map
