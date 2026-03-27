import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import angular from "@analogjs/vite-plugin-angular";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          tsconfigPaths: true,
        },
        test: {
          name: "node",
          globals: true,
          environment: "node",
          include: ["packages/*/tests/**/*.spec.ts"],
          exclude: ["packages/sd-angular/**", "**/node_modules/**", ".back/**"],
        },
      },
      {
        plugins: [
          angular({ tsconfig: "./packages/sd-angular/tsconfig.json", jit: true }),
        ],
        resolve: {
          tsconfigPaths: true,
        },
        optimizeDeps: {
          include: ["@angular/compiler", "@angular/platform-browser", "@angular/platform-browser/testing"],
        },
        test: {
          name: "sd-angular",
          globals: true,
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: false,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
          setupFiles: ["./packages/sd-angular/tests/setup.ts"],
          include: ["packages/sd-angular/tests/**/*.spec.ts"],
        },
      },
    ],
  },
});
