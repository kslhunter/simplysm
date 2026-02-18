import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { tokenVars } from "./variables/token.css";
import { themeVars } from "./variables/theme.css";
import { objMap } from "@simplysm/core-common";
const layoutProperties = defineProperties({
  properties: {
    // Display & Flex
    display: ["none", "block", "inline", "flex", "inline-flex", "grid"],
    flexDirection: ["row", "column", "row-reverse", "column-reverse"],
    flexWrap: ["nowrap", "wrap", "wrap-reverse"],
    alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"],
    justifyContent: [
      "flex-start",
      "center",
      "flex-end",
      "space-between",
      "space-around",
      "space-evenly",
    ],
    // Gap
    gap: tokenVars.spacing,
    rowGap: tokenVars.spacing,
    columnGap: tokenVars.spacing,
    // Padding
    padding: tokenVars.spacing,
    paddingTop: tokenVars.spacing,
    paddingRight: tokenVars.spacing,
    paddingBottom: tokenVars.spacing,
    paddingLeft: tokenVars.spacing,
    // Margin
    margin: tokenVars.spacing,
    marginTop: tokenVars.spacing,
    marginRight: tokenVars.spacing,
    marginBottom: tokenVars.spacing,
    marginLeft: tokenVars.spacing,
    // Etc
    fontSize: tokenVars.font.size,
    lineHeight: tokenVars.font.lineHeight,
    borderRadius: tokenVars.radius,
    boxShadow: tokenVars.shadow,
    opacity: tokenVars.overlay,
    width: { auto: "auto", full: "100%" },
    height: { auto: "auto", full: "100%" },
    position: ["static", "relative", "absolute", "fixed"],
    fontWeight: ["normal", "bold"],
    color: {
      ...objMap(themeVars.text, (key, val) => [key, `rgb(${val})`]),
      ...objMap(themeVars.control, (key, val) => [key, `rgb(${val.base})`]),
    },
  },
  shorthands: {
    // Padding shorthands
    p: ["padding"],
    pt: ["paddingTop"],
    pr: ["paddingRight"],
    pb: ["paddingBottom"],
    pl: ["paddingLeft"],
    px: ["paddingLeft", "paddingRight"],
    py: ["paddingTop", "paddingBottom"],
    // Margin shorthands
    m: ["margin"],
    mt: ["marginTop"],
    mr: ["marginRight"],
    mb: ["marginBottom"],
    ml: ["marginLeft"],
    mx: ["marginLeft", "marginRight"],
    my: ["marginTop", "marginBottom"],
  },
});
const atoms = createSprinkles(layoutProperties);
export { atoms };
//# sourceMappingURL=atoms.css.js.map
