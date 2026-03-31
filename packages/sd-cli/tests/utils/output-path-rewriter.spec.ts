import { describe, it, expect } from "vitest";
import path from "path";
import { createOutputPathRewriter, adjustMapSources, addJsExtensionToImports, rewriteScssImports } from "../../src/utils/output-path-rewriter";

// POSIX paths for assertions — after migration, createOutputPathRewriter returns POSIX paths
const pkgDir = path.resolve("/workspace/packages/my-pkg");
const distDir = path.resolve(pkgDir, "dist");
const posixDistDir = distDir.replace(/\\/g, "/");

describe("createOutputPathRewriter", () => {
  const rewrite = createOutputPathRewriter(pkgDir);

  it("rewrites own nested .d.ts to flat structure", () => {
    const nestedPath = path.resolve(distDir, "my-pkg", "src", "index.d.ts");
    const result = rewrite(nestedPath, "declare const x: number;");

    expect(result).not.toBeNull();
    expect(result![0]).toBe(posixDistDir + "/index.d.ts");
    expect(result![1]).toBe("declare const x: number;");
  });

  it("rewrites own nested subdirectory .d.ts to flat structure", () => {
    const nestedPath = path.resolve(distDir, "my-pkg", "src", "utils", "helper.d.ts");
    const result = rewrite(nestedPath, "declare const y: string;");

    expect(result).not.toBeNull();
    expect(result![0]).toBe(posixDistDir + "/utils/helper.d.ts");
  });

  it("returns null for other packages' nested .d.ts", () => {
    const otherPkgPath = path.resolve(distDir, "other-pkg", "src", "index.d.ts");
    const result = rewrite(otherPkgPath, "");

    expect(result).toBeNull();
  });

  it("passes through already flat .d.ts as-is", () => {
    const flatPath = path.resolve(distDir, "index.d.ts");
    const result = rewrite(flatPath, "declare const z: boolean;");

    expect(result).not.toBeNull();
    expect(result![0]).toBe(flatPath.replace(/\\/g, "/"));
    expect(result![1]).toBe("declare const z: boolean;");
  });

  it("returns null for files outside dist/", () => {
    const outsidePath = path.resolve(pkgDir, "src", "index.ts");
    const result = rewrite(outsidePath, "");

    expect(result).toBeNull();
  });

  it("adjusts .d.ts.map sources when rewriting nested to flat", () => {
    const nestedPath = path.resolve(distDir, "my-pkg", "src", "index.d.ts.map");
    const mapContent = JSON.stringify({ version: 3, sources: ["../../../../src/index.ts"] });
    const result = rewrite(nestedPath, mapContent);

    expect(result).not.toBeNull();
    expect(result![0]).toBe(posixDistDir + "/index.d.ts.map");
    // Sources path should be adjusted for the new location
    const parsedMap = JSON.parse(result![1]) as { sources: string[] };
    expect(parsedMap.sources).toBeDefined();
    expect(parsedMap.sources.length).toBe(1);
  });
});

describe("adjustMapSources", () => {
  it("returns content as-is when directories are the same", () => {
    const content = JSON.stringify({ version: 3, sources: ["./foo.ts"] });
    const result = adjustMapSources(content, "/a/b", "/a/b");
    expect(result).toBe(content);
  });

  it("adjusts sources relative paths when directory changes", () => {
    const original = path.resolve("/workspace/packages/my-pkg/dist/my-pkg/src");
    const target = path.resolve("/workspace/packages/my-pkg/dist");
    const content = JSON.stringify({
      version: 3,
      sources: [path.join("..", "..", "..", "src", "index.ts")],
    });

    const result = adjustMapSources(content, original, target);
    const parsed = JSON.parse(result) as { sources: string[] };

    // The absolute source should be the same, just the relative path changes
    const absoluteFromOriginal = path.resolve(original, "..", "..", "..", "src", "index.ts");
    const expectedRelative = path.relative(target, absoluteFromOriginal).replace(/\\/g, "/");
    expect(parsed.sources[0]).toBe(expectedRelative);
  });

  it("returns content as-is for invalid JSON", () => {
    const result = adjustMapSources("not json", "/a", "/b");
    expect(result).toBe("not json");
  });

  it("handles content without sources array", () => {
    const content = JSON.stringify({ version: 3 });
    const result = adjustMapSources(content, "/a", "/b");
    expect(JSON.parse(result)).toEqual({ version: 3 });
  });
});

// Acceptance: Scenario "확장자 없는 상대 import에 .js 추가"
// Acceptance: Scenario "이미 확장자가 있는 import는 변경하지 않는다"
// Acceptance: Scenario "bare specifier는 변경하지 않는다"
// Acceptance: Scenario "dynamic import에도 .js 추가"
describe("addJsExtensionToImports", () => {
  it("adds .js to extensionless relative import", () => {
    const input = 'import { foo } from "./utils";';
    expect(addJsExtensionToImports(input)).toBe('import { foo } from "./utils.js";');
  });

  it("adds .js to parent directory relative import", () => {
    const input = 'import { bar } from "../types";';
    expect(addJsExtensionToImports(input)).toBe('import { bar } from "../types.js";');
  });

  it("adds .js to dynamic import", () => {
    const input = 'const m = import("./lazy");';
    expect(addJsExtensionToImports(input)).toBe('const m = import("./lazy.js");');
  });

  it("does not modify import already ending with .js", () => {
    const input = 'import { x } from "./already.js";';
    expect(addJsExtensionToImports(input)).toBe(input);
  });

  it("does not modify import ending with .json", () => {
    const input = 'import data from "./data.json";';
    expect(addJsExtensionToImports(input)).toBe(input);
  });

  it("does not modify import ending with .css", () => {
    const input = 'import "./styles.css";';
    expect(addJsExtensionToImports(input)).toBe(input);
  });

  it("does not modify bare specifier", () => {
    const input = 'import { z } from "lodash-es";';
    expect(addJsExtensionToImports(input)).toBe(input);
  });

  it("does not modify scoped package specifier", () => {
    const input = 'import { a } from "@simplysm/core-common";';
    expect(addJsExtensionToImports(input)).toBe(input);
  });

  it("handles multiple imports in same text", () => {
    const input = [
      'import { a } from "./foo";',
      'import { b } from "lodash";',
      'import { c } from "../bar";',
    ].join("\n");
    const expected = [
      'import { a } from "./foo.js";',
      'import { b } from "lodash";',
      'import { c } from "../bar.js";',
    ].join("\n");
    expect(addJsExtensionToImports(input)).toBe(expected);
  });

  it("handles re-export from relative path", () => {
    const input = 'export { x } from "./module";';
    expect(addJsExtensionToImports(input)).toBe('export { x } from "./module.js";');
  });

  it("does not add .js to .scss side-effect import", () => {
    const input = 'import "./sd-card.scss";';
    expect(addJsExtensionToImports(input)).toBe(input);
  });
});

// Acceptance: Scenario "기본 import 경로 변환"
// Acceptance: Scenario "하위 디렉토리 경로 변환"
describe("rewriteScssImports", () => {
  it("rewrites side-effect .scss import to .css and returns scss import paths", () => {
    const input = 'import "./sd-card.scss";';
    const result = rewriteScssImports(input);
    expect(result.text).toBe('import "./sd-card.css";');
    expect(result.scssImports).toEqual(["./sd-card.scss"]);
  });

  it("rewrites subdirectory .scss import to .css and returns scss import paths", () => {
    const input = 'import "./styles/card.scss";';
    const result = rewriteScssImports(input);
    expect(result.text).toBe('import "./styles/card.css";');
    expect(result.scssImports).toEqual(["./styles/card.scss"]);
  });

  it("returns empty scssImports when no .scss imports exist", () => {
    const input = 'import { foo } from "./utils";\nimport "./styles.css";';
    const result = rewriteScssImports(input);
    expect(result.text).toBe(input);
    expect(result.scssImports).toEqual([]);
  });

  it("handles multiple .scss imports in same text", () => {
    const input = [
      'import "./flex.scss";',
      'import { Directive } from "@angular/core";',
      'import "./card.scss";',
    ].join("\n");
    const result = rewriteScssImports(input);
    expect(result.text).toBe([
      'import "./flex.css";',
      'import { Directive } from "@angular/core";',
      'import "./card.css";',
    ].join("\n"));
    expect(result.scssImports).toEqual(["./flex.scss", "./card.scss"]);
  });

  it("handles parent-directory .scss import", () => {
    const input = 'import "../shared/theme.scss";';
    const result = rewriteScssImports(input);
    expect(result.text).toBe('import "../shared/theme.css";');
    expect(result.scssImports).toEqual(["../shared/theme.scss"]);
  });

  it("handles dynamic import of .scss", () => {
    const input = 'import("./lazy.scss");';
    const result = rewriteScssImports(input);
    expect(result.text).toBe('import("./lazy.css");');
    expect(result.scssImports).toEqual(["./lazy.scss"]);
  });

  it("does not rewrite bare specifier ending in .scss", () => {
    const input = 'import "some-package/theme.scss";';
    const result = rewriteScssImports(input);
    // bare specifiers (not starting with ./ or ../) are not relative — should not be collected
    expect(result.text).toBe(input);
    expect(result.scssImports).toEqual([]);
  });
});
