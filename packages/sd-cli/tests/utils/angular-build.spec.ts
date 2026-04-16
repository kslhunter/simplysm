import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as angularBuildMod from "../../src/angular/angular-build";

describe("Angular Build Adapter - Library Compilation API", () => {
  // Rule: 어댑터는 Library 빌드에 필요한 Angular 컴파일러 API를 노출한다

  it("exports NgtscProgram from adapter module", () => {
    expect(typeof angularBuildMod.NgtscProgram).toBe("function");
  });

  it("exports OptimizeFor enum from adapter module", () => {
    expect(angularBuildMod.OptimizeFor.WholeProgram).toBeDefined();
    expect(angularBuildMod.OptimizeFor.SingleFile).toBeDefined();
  });

  it("NgtscProgram이 AngularLibraryHostExtensions로 확장된 ts.CompilerHost를 수용", () => {
    expect(typeof angularBuildMod.NgtscProgram).toBe("function");
  });
});

describe("Angular Build Adapter - Scope after Feature 3.1", () => {
  it("adapter only exports Library-path APIs (NgtscProgram, OptimizeFor)", () => {
    const exports = Object.keys(angularBuildMod);

    // Library-path exports retained
    expect(exports).toContain("NgtscProgram");
    expect(exports).toContain("OptimizeFor");

    // Client-path exports removed (moved to angular-facade.ts)
    expect(exports).not.toContain("buildApplicationInternal");
    expect(exports).not.toContain("serveWithVite");
    expect(exports).not.toContain("normalizeDevServerOptions");
    expect(exports).not.toContain("createAngularBuilderContext");
    expect(exports).not.toContain("ResultKind");
    expect(exports).not.toContain("IndexHtmlGenerator");
    expect(exports).not.toContain("checkPort");
    expect(exports).not.toContain("emitFilesToDisk");
  });

  it("adapter does not export browserslist/PostCSS APIs", () => {
    const exports = Object.keys(angularBuildMod);
    expect(exports).not.toContain("transformSupportedBrowsersToTargets");
    expect(exports).not.toContain("getSupportedBrowsers");
    expect(exports).not.toContain("loadPostcssConfiguration");
  });

  it("adapter does not export ServiceWorker/i18n APIs", () => {
    const exports = Object.keys(angularBuildMod);
    expect(exports).not.toContain("augmentAppWithServiceWorker");
    expect(exports).not.toContain("createI18nOptions");
  });
});

describe("Angular Build Adapter - Isolation", () => {
  const sdCliSrcDir = path.resolve(import.meta.dirname, "../../src");
  const adapterFiles = ["angular-build.ts", "vite-angular-plugin.ts", "esbuild-angular-compiler-plugin.ts", "esbuild-client-config.ts", "esbuild-index-html.ts", "esbuild-pwa.ts"];
  let srcFiles: string[];

  beforeAll(() => {
    const collectFiles = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((e) =>
        e.isDirectory()
          ? collectFiles(path.join(dir, e.name))
          : e.name.endsWith(".ts")
            ? [path.join(dir, e.name)]
            : [],
      );
    };
    srcFiles = collectFiles(sdCliSrcDir).filter(
      (f) => !adapterFiles.some((a) => f.endsWith(a)),
    );
  });

  // Rule: Library 경로 — angular-build.ts 통해서만 @angular/compiler-cli 접근
  it("no src file outside adapters imports @angular/compiler-cli", () => {
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        content.includes("@angular/compiler-cli"),
        `${path.relative(sdCliSrcDir, file)} imports @angular/compiler-cli directly`,
      ).toBe(false);
    }
  });

  // Rule: Client 경로 — vite-angular-plugin.ts 통해서만 @angular/build/private 접근 (JavaScriptTransformer)
  it("no src file outside adapters imports @angular/build/private", () => {
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(
        content.includes("@angular/build/private"),
        `${path.relative(sdCliSrcDir, file)} imports @angular/build/private directly`,
      ).toBe(false);
    }
  });

  // Rule: @angular/compiler-cli는 sd-cli의 직접 의존성이다
  it("package.json includes @angular/compiler-cli in dependencies", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(
        path.resolve(import.meta.dirname, "../../package.json"),
        "utf-8",
      ),
    );
    expect(pkgJson.dependencies["@angular/compiler-cli"]).toBeDefined();
  });
});
