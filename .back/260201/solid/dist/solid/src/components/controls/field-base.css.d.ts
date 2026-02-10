import { type RecipeVariants } from "@vanilla-extract/recipes";
/**
 * Field 높이 계산: fontSize * lineHeight + paddingY * 2 + border * 2
 */
export declare const fieldHeight: {
  sm: string;
  base: string;
  lg: string;
};
/**
 * 공통 base 스타일 (확장용)
 */
export declare const fieldBaseStyles: {
  readonly display: "block";
  readonly width: "100%";
  readonly height: string;
  readonly padding: `var(--${string}) var(--${string})`;
  readonly border: `1px solid rgb(var(--${string}))`;
  readonly borderRadius: `var(--${string})`;
  readonly background: `rgb(var(--${string}))`;
  readonly color: `rgb(var(--${string}))`;
  readonly fontSize: `var(--${string})`;
  readonly transition: `var(--${string}) linear`;
  readonly transitionProperty: "border-color, box-shadow, background-color";
};
/**
 * 공통 selectors (확장용)
 */
export declare const fieldBaseSelectors: {
  readonly "&:focus-within": {
    readonly outline: "none";
  };
  readonly "&:focus-visible": {
    readonly background: `rgb(var(--${string}))`;
  };
  readonly "&:disabled": {
    readonly opacity: `var(--${string})`;
    readonly pointerEvents: "none";
  };
  readonly "&[readonly]": {
    readonly background: `rgb(var(--${string}))`;
  };
  readonly "&::placeholder": {
    readonly color: `rgb(var(--${string}))`;
  };
};
/**
 * 공통 variants (확장용)
 */
export declare const fieldBaseVariants: {
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
};
/**
 * 모든 Field 컴포넌트가 공유하는 base recipe
 */
export declare const fieldBase: import("@vanilla-extract/recipes").RuntimeFn<{
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
export type FieldBaseStyles = NonNullable<RecipeVariants<typeof fieldBase>>;
/**
 * inset 모드용 컨테이너 스타일
 */
export declare const fieldContainer: string;
/**
 * inset 모드의 content 영역 (너비 결정용)
 */
export declare const fieldContent: string;
/**
 * inset 모드의 input 영역 (absolute positioned)
 */
export declare const fieldInput: string;
//# sourceMappingURL=field-base.css.d.ts.map
