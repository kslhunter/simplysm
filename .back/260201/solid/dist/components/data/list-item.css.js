import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/variables/vars.css";
const listItem = style({});
const listItemContent = recipe({
  base: {
    display: "flex",
    flexDirection: "row",
    gap: vars.spacing.xs,
    alignItems: "center",
    padding: `${vars.spacing.sm} ${vars.spacing.lg}`,
    cursor: "pointer",
    margin: "1px 2px",
    borderRadius: vars.radius.base,
  },
  variants: {
    layout: {
      accordion: {
        selectors: {
          "&:hover, &:focus-visible": {
            background: `rgba(${vars.surface.inverted}, ${vars.overlay.light})`,
          },
        },
      },
      flat: {},
    },
    selected: {
      true: {
        background: `rgba(${vars.control.primary.base}, ${vars.overlay.base})`,
        color: `rgb(${vars.control.primary.base})`,
        fontWeight: "bold",
      },
    },
    disabled: {
      true: {
        cursor: "default",
        pointerEvents: "none",
        opacity: vars.overlay.muted,
      },
    },
    hasSelectedIcon: {
      true: {},
    },
    hasChildren: {
      true: {},
    },
  },
  compoundVariants: [
    {
      variants: {
        layout: "flat",
        hasChildren: true,
      },
      style: {
        cursor: "default",
        fontSize: vars.font.size.sm,
        fontWeight: "bold",
        color: `rgba(${vars.text.base}, ${vars.overlay.muted})`,
        background: "transparent",
        paddingTop: vars.spacing.lg,
        paddingBottom: vars.spacing.none,
      },
    },
    {
      variants: {
        hasSelectedIcon: true,
        selected: true,
      },
      style: {
        selectors: {
          "&:hover, &:focus-visible": {
            background: `rgba(${vars.surface.inverted}, ${vars.overlay.light})`,
          },
        },
      },
    },
  ],
  defaultVariants: {
    layout: "accordion",
  },
});
export { listItem, listItemContent };
//# sourceMappingURL=list-item.css.js.map
