import { fileURLToPath } from "url";
import simplysmPreset from "@simplysm/solid/tailwind.config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [`${__dirname}index.html`, `${__dirname}src/**/*.{ts,tsx}`, ...simplysmPreset.content],
};
