import { keyframes, style } from "@vanilla-extract/css";
import { tokenVars } from "../styles/variables/token.css";
import { themeVars } from "../styles/variables/theme.css";
const rippleKeyframes = keyframes({
  from: {
    transform: "scale(0)",
    opacity: "0",
  },
  to: {
    transform: "scale(1)",
    opacity: tokenVars.overlay.base,
  },
});
const rippleOutKeyframes = keyframes({
  from: {
    opacity: tokenVars.overlay.base,
  },
  to: {
    opacity: "0",
  },
});
const rippleStyle = style({
  position: "absolute",
  borderRadius: tokenVars.radius.full,
  pointerEvents: "none",
  backgroundColor: `rgb(${themeVars.surface.inverted})`,
  animation: `${rippleKeyframes} ${tokenVars.duration.slow} cubic-bezier(0.4, 0, 0.2, 1) forwards`,
});
const rippleOut = style({
  animation: `${rippleOutKeyframes} ${tokenVars.duration.base} ease-out forwards !important`,
});
export { rippleOut, rippleStyle };
//# sourceMappingURL=ripple.css.js.map
