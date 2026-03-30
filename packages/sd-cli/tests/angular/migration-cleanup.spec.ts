import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");

describe("마이그레이션 정리", () => {
  // Scenario: angular-facade.ts 파일이 삭제된다
  it("angular-facade.ts does not exist", () => {
    const facadePath = path.join(SRC_DIR, "angular/angular-facade.ts");
    expect(fs.existsSync(facadePath)).toBe(false);
  });

  // Scenario: angular-facade.ts를 import하는 코드가 없다
  it("no imports of angular-facade in src directory", () => {
    const files = getAllTsFiles(SRC_DIR);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("angular-facade");
    }
  });

  // Scenario: @angular/build/private에서 JavaScriptTransformer만 import
  it("only JavaScriptTransformer is imported from @angular/build/private", () => {
    const files = getAllTsFiles(SRC_DIR);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (!content.includes("@angular/build/private")) {
        continue;
      }
      // Should only import JavaScriptTransformer from @angular/build/private
      // Check that only valid imports exist (not the removed ones)
      const importLines = content
        .split("\n")
        .filter((line) => line.includes("@angular/build/private"));
      for (const line of importLines) {
        expect(line).not.toMatch(/\bcreateAngularCompilation\b/);
        // Match standalone SourceFileCache, not AngularSourceFileCache
        expect(line).not.toMatch(/\bSourceFileCache\b/);
        expect(line).not.toMatch(/\bComponentStylesheetBundler\b/);
        expect(line).toContain("JavaScriptTransformer");
      }
    }
  });
});

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}
