import { style } from "@vanilla-extract/css";
import { themeVars } from "../styles/variables/theme.css";

export const invalidContainer = style({
  position: "relative",
  overflow: "hidden",
});

export const invalidDot = style({
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      top: "2px",
      left: "2px",
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: `rgb(${themeVars.control.danger.base})`,
      pointerEvents: "none",
      zIndex: 1,
    },
  },
});

export const hiddenInputStyle = style({
  position: "absolute",
  opacity: 0,
  width: 0,
  height: 0,
  pointerEvents: "none",
  top: 0,
  left: 0,
});
