import { describe, expect, it } from "vitest";
import { createViteConfig } from "../src/utils/vite-config";
import path from "path";

describe("createViteConfig exclude option", () => {
  const baseOptions = {
    pkgDir: path.resolve(__dirname, ".."),
    name: "test-app",
    tsconfigPath: path.resolve(__dirname, "../../..", "tsconfig.json"),
    compilerOptions: {},
    mode: "build" as const,
  };

  it("should set optimizeDeps.exclude when exclude option is provided", () => {
    const config = createViteConfig({ ...baseOptions, exclude: ["jeep-sqlite"] });

    expect(config.optimizeDeps?.exclude).toContain("jeep-sqlite");
  });

  it("should not set optimizeDeps.exclude when exclude option is not provided", () => {
    const config = createViteConfig(baseOptions);

    expect(config.optimizeDeps?.exclude).toBeUndefined();
  });

  it("should handle multiple exclude packages", () => {
    const config = createViteConfig({
      ...baseOptions,
      exclude: ["jeep-sqlite", "electron"],
    });

    expect(config.optimizeDeps?.exclude).toContain("jeep-sqlite");
    expect(config.optimizeDeps?.exclude).toContain("electron");
  });
});
