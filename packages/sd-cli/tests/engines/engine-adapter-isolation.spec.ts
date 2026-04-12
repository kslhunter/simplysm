import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Acceptance: Scenario "EsbuildClientEngine이 어댑터 격리를 준수한다"
describe("EsbuildClientEngine adapter isolation", () => {
  it("EsbuildClientEngine과 그 워커가 @angular/* 패키지를 직접 import하지 않음", () => {

    const sdCliSrc = path.resolve(import.meta.dirname, "../../src");

    const filesToCheck = [
      path.join(sdCliSrc, "engines", "EsbuildClientEngine.ts"),
      path.join(sdCliSrc, "workers", "client.worker.ts"),
    ];

    const angularImportPattern = /from\s+["']@angular\/(build|compiler-cli)/;

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf-8");
      const hasDirectImport = angularImportPattern.test(content);
      expect(
        hasDirectImport,
        `${path.basename(filePath)} should not directly import @angular/*`,
      ).toBe(false);
    }
  });

  it("vite-angular-plugin.ts imports only JavaScriptTransformer from @angular/build/private", () => {

    const pluginFile = path.resolve(
      import.meta.dirname,
      "../../src/angular/vite-angular-plugin.ts",
    );
    const content = fs.readFileSync(pluginFile, "utf-8");

    expect(content).toContain("@angular/build/private");
    expect(content).toContain("JavaScriptTransformer");
    expect(content).not.toContain("createAngularCompilation");
    expect(content).not.toMatch(/\bSourceFileCache\b(?<!AngularSourceFileCache)/);
    expect(content).not.toContain("ComponentStylesheetBundler");
  });
});

// Acceptance: Scenario "NgtscEngine이 어댑터 격리를 준수한다"
describe("NgtscEngine adapter isolation", () => {
  it("NgtscEngine과 그 의존성이 @angular/* 패키지를 직접 import하지 않음", () => {

    const sdCliSrc = path.resolve(import.meta.dirname, "../../src");

    const filesToCheck = [
      path.join(sdCliSrc, "engines", "NgtscEngine.ts"),
      path.join(sdCliSrc, "workers", "ngtsc-build.worker.ts"),
      path.join(sdCliSrc, "angular", "ngtsc-build-core.ts"),
      path.join(sdCliSrc, "utils", "output-path-rewriter.ts"),
    ];

    const angularImportPattern = /from\s+["']@angular\/(build|compiler-cli)/;

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf-8");
      const hasDirectImport = angularImportPattern.test(content);
      expect(
        hasDirectImport,
        `${path.basename(filePath)} should not directly import @angular/*`,
      ).toBe(false);
    }
  });

  it("all Angular API access goes through angular-compiler.ts adapter", () => {

    // Angular API 접근은 angular-build-pipeline.ts를 통해 angular-compiler.ts로 이루어진다
    const buildPipeline = path.resolve(
      import.meta.dirname,
      "../../src/angular/angular-build-pipeline.ts",
    );
    const content = fs.readFileSync(buildPipeline, "utf-8");

    expect(content).toContain("./angular-compiler");
  });
});
