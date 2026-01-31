import { tokenVars } from "../variables/token.css";

export const booleanTransitionCss = {
  true: {
    transition: `${tokenVars.duration.base} ease-out`,
  },
  false: {
    transition: `${tokenVars.duration.base} ease-in`,
  },
} as const;
