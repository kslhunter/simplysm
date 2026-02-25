import { fileURLToPath } from "url";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const lh = defaultTheme.lineHeight.normal; // "1.5"
const sp = defaultTheme.spacing;

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// export const tailwindContent = [`${__dirname}**/*.tsx`];

const fieldSizes = {
  "field": `calc(${lh}rem + ${sp["1"]} + ${sp["1"]} + 2px)`,
  "field-xs": `calc(${lh}rem + 2px)`,
  "field-sm": `calc(${lh}rem + ${sp["0.5"]} + ${sp["0.5"]} + 2px)`,
  "field-lg": `calc(${lh}rem + ${sp["2"]} + ${sp["2"]} + 2px)`,
  "field-xl": `calc(${lh}rem + ${sp["3"]} + ${sp["3"]} + 2px)`,
  "field-inset": `calc(${lh}rem + ${sp["1"]} + ${sp["1"]})`,
  "field-inset-xs": `${lh}rem`,
  "field-inset-sm": `calc(${lh}rem + ${sp["0.5"]} + ${sp["0.5"]})`,
  "field-inset-lg": `calc(${lh}rem + ${sp["2"]} + ${sp["2"]})`,
  "field-inset-xl": `calc(${lh}rem + ${sp["3"]} + ${sp["3"]})`,
};

export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        info: colors.sky,
        success: colors.green,
        warning: colors.amber,
        danger: colors.red,
        base: colors.zinc,
      },
      height: fieldSizes,
      size: fieldSizes,
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-1rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out both",
      },
      zIndex: {
        "sidebar": "100",
        "sidebar-backdrop": "99",
        "busy": "500",
        "dropdown": "1000",
        "modal-backdrop": "1999",
        "modal": "2000",
        "notification": "3000",
      },
    },
  },
  content: [`${__dirname}src/**/*.{ts,tsx}`, `${__dirname}dist/**/*.js`],
  corePlugins: {
    aspectRatio: false, // Not supported in Chrome 84
  },
};
