import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { objEntries, objMap } from "@simplysm/core-common";
import { vars } from "@simplysm/solid/styles";

export const button = recipe({
  base: {
    display: "inline-flex",
    userSelect: "none",
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: vars.radius.base,
    cursor: "pointer",

    padding: `${vars.spacing.sm} ${vars.spacing.lg}`,

    background: `rgb(${vars.surface.base})`,
    border: `1px solid transparent`,
    borderColor: `rgb(${vars.border.base})`,

    transition: `${vars.duration.base} linear`,
    transitionProperty: "border-color, background",

    selectors: {
      "&:hover, &:focus-visible": {
        background: `rgb(${vars.surface.elevated})`,
      },
      "&:disabled": {
        pointerEvents: "none",
        opacity: vars.overlay.muted,
      },
    },
  },
  variants: {
    theme: objMap(vars.control, (theme, color) => [
      theme,
      {
        background: `rgb(${color.base})`,
        borderColor: "transparent",
        color: `rgb(${vars.text.inverted})`,
        selectors: {
          "&:hover, &:focus-visible": {
            background: `rgb(${color.hover})`,
          },
        },
      },
    ]),
    link: {
      true: {
        background: "transparent",
        borderColor: "transparent",
      },
    },
    inset: {
      true: {
        border: "none",
        borderRadius: 0,
      },
    },
    size: {
      xs: {
        padding: `${vars.spacing.xxs} ${vars.spacing.sm}`,
        fontSize: `${vars.font.size.sm}`,
      },
      sm: {
        padding: `${vars.spacing.xs} ${vars.spacing.base}`,
      },
      base: {},
      lg: {
        padding: `${vars.spacing.base} ${vars.spacing.xl}`,
      },
      xl: {
        padding: `${vars.spacing.lg} ${vars.spacing.xxl}`,
        fontSize: `${vars.font.size.lg}`,
      },
    },
  },
  compoundVariants: [
    ...objEntries(vars.control).map(([theme, color]) => ({
      variants: {
        theme,
        link: true,
      },
      style: {
        background: "transparent",
        borderColor: `transparent`,
        color: `rgb(${color.base})`,
        selectors: {
          "&:hover, &:focus-visible": {
            background: `rgb(${color.muted})`,
          },
        },
      },
    })),
  ],
});

export type ButtonStyles = NonNullable<RecipeVariants<typeof button>>;
