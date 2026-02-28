import simplysmRecommended from "@simplysm/lint/eslint-recommended";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([".legacy/**"]),
  ...simplysmRecommended,
  {
    files: ["**/*.{ts,tsx}"],
    settings: {
      tailwindcss: {
        config: "packages/client-admin/tailwind.config.ts",
      },
    },
  },
];
