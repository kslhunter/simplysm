import colors from "tailwindcss/colors";

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "") // Vite 가상 경로 제거
  .replace(/index\.ts$/, ""); // re-export 시 index.ts 경로 제거

// export const tailwindContent = [`${__dirname}**/*.tsx`];

export default {
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        info: colors.cyan,
        success: colors.lime,
        warning: colors.amber,
        danger: colors.red,
      },
    },
  },
  content: [`${__dirname}src/**/*.tsx`],
  corePlugins: {
    aspectRatio: false, // Chrome 84 미지원
  },
};
