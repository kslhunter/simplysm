import { describe, expect, it } from "vitest";
import { createViteConfig } from "../src/utils/vite-config";
import path from "path";

describe("createViteConfig capacitor overrides", () => {
  const baseOptions = {
    pkgDir: path.resolve(__dirname, ".."),
    name: "test-app",
    tsconfigPath: path.resolve(__dirname, "../../..", "tsconfig.json"),
    compilerOptions: {},
    mode: "build" as const,
  };

  it("should set build.outDir when outDir option is provided", () => {
    const outDir = path.join(baseOptions.pkgDir, ".capacitor", "www");
    const config = createViteConfig({ ...baseOptions, outDir });

    expect(config.build?.outDir).toBe(outDir);
  });

  it("should not set build.outDir when outDir option is not provided", () => {
    const config = createViteConfig(baseOptions);

    expect(config.build?.outDir).toBeUndefined();
  });

  it("should override base when base option is provided", () => {
    const config = createViteConfig({ ...baseOptions, base: "./" });

    expect(config.base).toBe("./");
  });

  it("should use /{name}/ as base when base option is not provided", () => {
    const config = createViteConfig(baseOptions);

    expect(config.base).toBe("/test-app/");
  });
});
