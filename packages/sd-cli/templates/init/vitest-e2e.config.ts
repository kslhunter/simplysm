import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: ".",
      projects: ["./tsconfig.json"],
    }),
  ],
  define: {
    "process.env.DEV": JSON.stringify("true"),
    "process.env.VER": JSON.stringify("1.0.0-test"),
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests-e2e/src/**/*.spec.ts"],
    globalSetup: "./tests-e2e/vitest.setup.ts",
    fileParallelism: false,
    testTimeout: 30000,
  },
});
