import simplysmPreset from "@simplysm/solid/tailwind.config";

const __dirname = new URL(".", import.meta.url).pathname
  .replace(/^\/[^/]+\/@fs/, "") // Remove Vite virtual paths
  .replace(/index\.ts$/, ""); // Remove index.ts path during re-export

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [`${__dirname}index.html`, `${__dirname}src/**/*.{ts,tsx}`, ...simplysmPreset.content],
};
