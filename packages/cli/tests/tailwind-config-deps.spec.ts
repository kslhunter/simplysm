import { describe, expect, it } from "vitest";
import path from "path";
import { getTailwindConfigDeps } from "../src/utils/tailwind-config-deps";

const packagesDir = path.resolve(import.meta.dirname, "../..");

describe("getTailwindConfigDeps", () => {
  it("solid-demo tailwind config의 의존성에 solid tailwind config가 포함되어야 함", () => {
    const configPath = path.join(packagesDir, "solid-demo/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    const solidConfig = path.join(packagesDir, "solid/tailwind.config.ts");
    expect(deps).toContain(solidConfig);
  });

  it("config 자신도 의존성에 포함되어야 함", () => {
    const configPath = path.join(packagesDir, "solid-demo/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    expect(deps).toContain(path.resolve(configPath));
  });

  it("@simplysm/ 이외의 패키지(tailwindcss/colors 등)는 포함하지 않아야 함", () => {
    const configPath = path.join(packagesDir, "solid/tailwind.config.ts");
    const deps = getTailwindConfigDeps(configPath, ["@simplysm"]);

    // solid/tailwind.config.ts는 tailwindcss/colors를 import하지만 추적하지 않음
    expect(deps).toHaveLength(1); // 자기 자신만
  });
});
