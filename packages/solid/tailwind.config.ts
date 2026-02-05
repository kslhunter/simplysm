import colors from "tailwindcss/colors";

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "") // Vite 가상 경로 제거
  .replace(/index\.ts$/, ""); // re-export 시 index.ts 경로 제거

// export const tailwindContent = [`${__dirname}**/*.tsx`];

export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        info: colors.cyan,
        success: colors.lime,
        warning: colors.amber,
        danger: colors.red,
      },
      zIndex: {
        sidebar: "100",
        "sidebar-backdrop": "99",
        dropdown: "1000",
      },
      animation: {
        "card-in": "card-in 0.3s ease-out forwards",
      },
      keyframes: {
        "card-in": {
          from: { opacity: "0", transform: "translateY(-1rem)" },
          to: { opacity: "1", transform: "none" },
        },
      },
    },
  },
  content: [`${__dirname}src/**/*.{ts,tsx}`],
  corePlugins: {
    aspectRatio: false, // Chrome 84 미지원
  },
};
