import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { playwright } from "@vitest/browser-playwright";
import angular from "@analogjs/vite-plugin-angular";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  plugins: [
    angular({ tsconfig: path.resolve(import.meta.dirname, "tsconfig.spec.json"), jit: true }) as any,
    tsconfigPaths({ projects: [path.resolve(import.meta.dirname, "../../tsconfig.base.json")] }),
  ],
  optimizeDeps: {
    include: ["@angular/compiler", "@angular/platform-browser", "@angular/platform-browser/testing"],
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.spec.ts"],
  },
});
