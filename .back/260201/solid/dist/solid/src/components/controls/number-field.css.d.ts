import { type RecipeVariants } from "@vanilla-extract/recipes";
import { fieldContainer, fieldContent, fieldInput } from "./field-base.css";
export {
  fieldContainer as numberFieldContainer,
  fieldContent as numberFieldContent,
  fieldInput as numberFieldInput,
};
/**
 * NumberField 스타일 (fieldBase 확장 - textAlign: right, 스피너 숨김)
 */
export declare const numberField: import("@vanilla-extract/recipes").RuntimeFn<{
  readonly size: {
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
  readonly inset: {
    readonly true: {
      readonly border: "none";
      readonly borderRadius: 0;
      readonly background: "transparent";
    };
  };
  readonly inline: {
    readonly true: {
      readonly display: "inline-block";
      readonly width: "auto";
    };
  };
}>;
export type NumberFieldStyles = NonNullable<RecipeVariants<typeof numberField>>;
//# sourceMappingURL=number-field.css.d.ts.map
