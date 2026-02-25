import { describe, expect, it } from "vitest";
import path from "path";
import { getTailwindConfigDeps } from "../src/utils/tailwind-config-deps";

const packagesDir = path.resolve(import.meta.dirname, "../..");

describe("getTailwindConfigDeps", () => {
  it("includes solid tailwind config in dependencies of solid-demo tailwind config", () => {
    const configPath = path.join(packagesDir, "solid-demo/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    const solidConfig = path.join(packagesDir, "solid/tailwind.config.ts");
    expect(deps).toContain(solidConfig);
  });

  it("includes the config itself in dependencies", () => {
    const configPath = path.join(packagesDir, "solid-demo/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    expect(deps).toContain(path.resolve(configPath));
  });

  it("excludes packages outside @simplysm/ (like tailwindcss/colors)", () => {
    const configPath = path.join(packagesDir, "solid/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    // solid/tailwind.config.ts imports tailwindcss/colors but does not track it
    expect(deps).toHaveLength(1); // only itself
  });
});
