import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const lh = defaultTheme.lineHeight.normal; // "1.5"
const sp = defaultTheme.spacing;

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "") // Vite 가상 경로 제거
  .replace(/index\.ts$/, ""); // re-export 시 index.ts 경로 제거

// export const tailwindContent = [`${__dirname}**/*.tsx`];

const fieldSizes = {
  "field": `calc(${lh}rem + ${sp["1"]} + ${sp["1"]} + 2px)`,
  "field-sm": `calc(${lh}rem + ${sp["0.5"]} + ${sp["0.5"]} + 2px)`,
  "field-lg": `calc(${lh}rem + ${sp["2"]} + ${sp["2"]} + 2px)`,
  "field-inset": `calc(${lh}rem + ${sp["1"]} + ${sp["1"]})`,
  "field-inset-sm": `calc(${lh}rem + ${sp["0.5"]} + ${sp["0.5"]})`,
  "field-inset-lg": `calc(${lh}rem + ${sp["2"]} + ${sp["2"]})`,
  "field-xl": `calc(${lh}rem + ${sp["3"]} + ${sp["3"]} + 2px)`,
  "field-inset-xl": `calc(${lh}rem + ${sp["3"]} + ${sp["3"]})`,
};

export default {
  darkMode: "class",
  theme: {
    extend: {
      spacing: {
        xs: "0.125rem",
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
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
      zIndex: {
        "sidebar": "100",
        "sidebar-backdrop": "99",
        "busy": "500",
        "dropdown": "1000",
        "modal-backdrop": "1999",
        "modal": "2000",
      },
    },
  },
  content: [`${__dirname}src/**/*.{ts,tsx}`, `${__dirname}dist/**/*.js`],
  corePlugins: {
    aspectRatio: false, // Chrome 84 미지원
  },
};
