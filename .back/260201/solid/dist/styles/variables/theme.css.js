import { createTheme } from "@vanilla-extract/css";
import { colorVars } from "./colors.css";
const [lightTheme, themeVars] = createTheme({
  control: {
    primary: {
      base: colorVars.blue["500"],
      hover: colorVars.blue["600"],
      active: colorVars.blue["700"],
      muted: colorVars.blue["100"]
    },
    secondary: {
      base: colorVars.gray["500"],
      hover: colorVars.gray["600"],
      active: colorVars.gray["700"],
      muted: colorVars.gray["100"]
    },
    success: {
      base: colorVars.emerald["500"],
      hover: colorVars.emerald["600"],
      active: colorVars.emerald["700"],
      muted: colorVars.emerald["100"]
    },
    warning: {
      base: colorVars.orange["500"],
      hover: colorVars.orange["600"],
      active: colorVars.orange["700"],
      muted: colorVars.orange["100"]
    },
    danger: {
      base: colorVars.rose["500"],
      hover: colorVars.rose["600"],
      active: colorVars.rose["700"],
      muted: colorVars.rose["100"]
    },
    info: {
      base: colorVars.sky["500"],
      hover: colorVars.sky["600"],
      active: colorVars.sky["700"],
      muted: colorVars.sky["100"]
    },
    gray: {
      base: colorVars.zinc["500"],
      hover: colorVars.zinc["600"],
      active: colorVars.zinc["700"],
      muted: colorVars.zinc["100"]
    },
    slate: {
      base: colorVars.slate["500"],
      hover: colorVars.slate["600"],
      active: colorVars.slate["700"],
      muted: colorVars.slate["100"]
    }
  },
  surface: {
    base: colorVars.white,
    elevated: colorVars.gray["100"],
    muted: colorVars.gray["200"],
    inverted: colorVars.black
  },
  text: {
    base: colorVars.gray["800"],
    muted: colorVars.gray["500"],
    inverted: colorVars.white
  },
  border: {
    base: colorVars.gray["300"],
    muted: colorVars.gray["100"]
  }
});
const darkTheme = createTheme(themeVars, {
  control: {
    primary: {
      base: colorVars.blue["600"],
      hover: colorVars.blue["500"],
      active: colorVars.blue["400"],
      muted: colorVars.blue["900"]
    },
    secondary: {
      base: colorVars.gray["600"],
      hover: colorVars.gray["500"],
      active: colorVars.gray["400"],
      muted: colorVars.gray["900"]
    },
    success: {
      base: colorVars.emerald["600"],
      hover: colorVars.emerald["500"],
      active: colorVars.emerald["400"],
      muted: colorVars.emerald["900"]
    },
    warning: {
      base: colorVars.orange["600"],
      hover: colorVars.orange["500"],
      active: colorVars.orange["400"],
      muted: colorVars.orange["900"]
    },
    danger: {
      base: colorVars.rose["600"],
      hover: colorVars.rose["500"],
      active: colorVars.rose["400"],
      muted: colorVars.rose["900"]
    },
    info: {
      base: colorVars.sky["600"],
      hover: colorVars.sky["500"],
      active: colorVars.sky["400"],
      muted: colorVars.sky["900"]
    },
    gray: {
      base: colorVars.zinc["600"],
      hover: colorVars.zinc["500"],
      active: colorVars.zinc["400"],
      muted: colorVars.zinc["900"]
    },
    slate: {
      base: colorVars.slate["600"],
      hover: colorVars.slate["500"],
      active: colorVars.slate["400"],
      muted: colorVars.slate["900"]
    }
  },
  surface: {
    base: colorVars.slate["900"],
    elevated: colorVars.slate["800"],
    muted: colorVars.slate["950"],
    inverted: colorVars.white
  },
  text: {
    base: colorVars.gray["100"],
    muted: colorVars.gray["500"],
    inverted: colorVars.gray["100"]
  },
  border: {
    base: colorVars.slate["700"],
    muted: colorVars.slate["800"]
  }
});
export {
  darkTheme,
  lightTheme,
  themeVars
};
//# sourceMappingURL=theme.css.js.map
