import simplysmRootConfigs from "./packages/lint/src/eslint-recommended";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([".legacy-packages/**", "packages/sd-claude/claude/**", "packages/sd-cli/templates/**"]),
  ...simplysmRootConfigs,
  // Tailwind CSS v3: Specify the config file path
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/solid-demo/tailwind.config.ts",
      },
    },
  },
];
