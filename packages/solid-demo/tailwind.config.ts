import simplysmPreset from "@simplysm/solid/tailwind.config";

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "") // Vite 가상 경로 제거
  .replace(/index\.ts$/, ""); // re-export 시 index.ts 경로 제거

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [`${__dirname}index.html`, `${__dirname}src/**/*.{ts,tsx}`, ...simplysmPreset.content],
};
