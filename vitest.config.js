import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ["./tsconfig.base.json"],
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.spec.ts"],
  },
});
