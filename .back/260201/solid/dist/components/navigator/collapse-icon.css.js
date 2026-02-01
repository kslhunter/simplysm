import { recipe } from "@vanilla-extract/recipes";
import { booleanTransitionCss } from "../../styles/mixins/boolean-transition.css";
const collapseIcon = recipe({
  base: {
    display: "inline-block",
    transitionProperty: "transform"
  },
  variants: {
    open: booleanTransitionCss
  }
});
export {
  collapseIcon
};
//# sourceMappingURL=collapse-icon.css.js.map
