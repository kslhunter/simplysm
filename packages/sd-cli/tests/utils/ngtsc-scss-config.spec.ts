import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const angularPkgDir = path.resolve(import.meta.dirname, "../../../../packages/angular");

// Acceptance: Scenario "ambient module 선언으로 .scss import 해석"
describe("angular package SCSS ambient declaration", () => {
  it("declares ambient module for *.scss files", () => {
    const scssDtsPath = path.join(angularPkgDir, "src", "scss.d.ts");
    expect(fs.existsSync(scssDtsPath)).toBe(true);
    const content = fs.readFileSync(scssDtsPath, "utf-8");
    expect(content).toContain('declare module "*.scss"');
  });
});

// Acceptance: Scenario "sideEffects에 CSS 패턴 추가"
describe("angular package.json sideEffects", () => {
  it("includes ./dist/**/*.css in sideEffects", () => {
    const pkgJsonPath = path.join(angularPkgDir, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as {
      sideEffects?: string[];
    };
    expect(pkgJson.sideEffects).toContain("./dist/**/*.css");
  });
});
