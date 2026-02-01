import { style } from "@vanilla-extract/css";
import { themeVars } from "../styles/variables/theme.css";
const invalidContainer = style({
  position: "relative"
});
const invalidDot = style({
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
      zIndex: 1
    }
  }
});
const hiddenInputStyle = style({
  position: "absolute",
  opacity: 0,
  width: 0,
  height: 0,
  pointerEvents: "none",
  // 폼 제출 시 포커스가 이 요소로 이동하면 부모로 스크롤되도록
  top: 0,
  left: 0
});
export {
  hiddenInputStyle,
  invalidContainer,
  invalidDot
};
//# sourceMappingURL=invalid.css.js.map
