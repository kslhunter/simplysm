import { style } from "@vanilla-extract/css";

export const dropdown = style({
  display: "inline-block",
  cursor: "pointer",

  selectors: {
    "&:focus": {
      outline: "none",
    },
    "&[data-disabled='true']": {
      cursor: "not-allowed",
      pointerEvents: "none",
    },
  },
});
