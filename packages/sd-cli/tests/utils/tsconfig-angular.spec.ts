import { describe, it, expect } from "vitest";

describe("hasAngularCompilerOptions removal", () => {
  // Unit: hasAngularCompilerOptions no longer exported from tsconfig.ts
  it("does not export hasAngularCompilerOptions", async () => {
    const tsconfig = await import("../../src/utils/tsconfig");
    expect("hasAngularCompilerOptions" in tsconfig).toBe(false);
  });
});
