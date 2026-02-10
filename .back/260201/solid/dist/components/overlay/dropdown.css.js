import { style } from "@vanilla-extract/css";
const dropdown = style({
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
export { dropdown };
//# sourceMappingURL=dropdown.css.js.map
