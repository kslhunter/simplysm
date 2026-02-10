import { recipe } from "@vanilla-extract/recipes";
import { booleanTransitionCss } from "../../styles/mixins/boolean-transition.css";
const collapse = recipe({
  base: {
    overflow: "hidden",
    transitionProperty: "height",
  },
  variants: {
    open: booleanTransitionCss,
  },
});
export { collapse };
//# sourceMappingURL=collapse.css.js.map
