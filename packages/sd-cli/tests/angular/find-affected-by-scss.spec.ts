import { describe, it, expect } from "vitest";
import { findAffectedByScss } from "../../src/angular/vite-angular-plugin.js";

describe("findAffectedByScss", () => {
  it("returns owner file when SCSS is in its dependency set", () => {
    const deps = new Map<string, Set<string>>();
    deps.set("/app/src/comp.ts", new Set(["/app/scss/_vars.scss"]));

    const result = findAffectedByScss("/app/scss/_vars.scss", deps);
    expect(result).toEqual(["/app/src/comp.ts"]);
  });

  it("returns multiple owners when multiple components depend on the same SCSS", () => {
    const deps = new Map<string, Set<string>>();
    deps.set("/app/src/comp-a.ts", new Set(["/app/scss/_vars.scss"]));
    deps.set("/app/src/comp-b.ts", new Set(["/app/scss/_vars.scss", "/app/scss/_extra.scss"]));
    deps.set("/app/src/comp-c.ts", new Set(["/app/scss/_other.scss"]));

    const result = findAffectedByScss("/app/scss/_vars.scss", deps);
    expect(result).toEqual(expect.arrayContaining(["/app/src/comp-a.ts", "/app/src/comp-b.ts"]));
    expect(result).not.toContain("/app/src/comp-c.ts");
  });

  it("returns empty array when no component depends on the SCSS", () => {
    const deps = new Map<string, Set<string>>();
    deps.set("/app/src/comp.ts", new Set(["/app/scss/_vars.scss"]));

    const result = findAffectedByScss("/app/scss/_unknown.scss", deps);
    expect(result).toEqual([]);
  });

  it("returns empty array when scssDependencies is empty", () => {
    const deps = new Map<string, Set<string>>();
    const result = findAffectedByScss("/app/scss/_vars.scss", deps);
    expect(result).toEqual([]);
  });
});
