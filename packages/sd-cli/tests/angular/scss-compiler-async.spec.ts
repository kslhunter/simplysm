import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { compileScssFileAsync, compileScssStringAsync } from "../../src/utils/scss-compiler.js";

const TMP_DIR = path.join(os.tmpdir(), "sd-cli-scss-test");

function ensureTmpDir(): void {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

describe("scss-compiler async", () => {
  // Scenario: 외부 .scss 파일 변환
  it("compiles external .scss file asynchronously", async () => {
    ensureTmpDir();
    const scssPath = path.join(TMP_DIR, "test.scss");
    fs.writeFileSync(scssPath, "$color: red;\n.host { color: $color; }");

    const result = await compileScssFileAsync(scssPath, []);

    expect(result.css).toContain("color: red");
    expect(result.css).not.toContain("$color");
    expect(result.dependencies).toBeInstanceOf(Array);
  });

  // Scenario: 인라인 SCSS 문자열 변환
  it("compiles inline SCSS string asynchronously", async () => {
    ensureTmpDir();
    const containingFile = path.join(TMP_DIR, "component.ts");

    const result = await compileScssStringAsync(
      "$size: 16px;\n.text { font-size: $size; }",
      containingFile,
      [],
    );

    expect(result.css).toContain("font-size: 16px");
    expect(result.css).not.toContain("$size");
    expect(result.dependencies).toBeInstanceOf(Array);
  });

  // Scenario: SCSS 컴파일 에러 시 에러
  it("throws on invalid SCSS syntax", async () => {
    ensureTmpDir();
    const scssPath = path.join(TMP_DIR, "invalid.scss");
    fs.writeFileSync(scssPath, ".host { color: ; }"); // valid actually, let's use truly invalid
    fs.writeFileSync(scssPath, ".host { @include nonexistent-mixin(); }");

    await expect(compileScssFileAsync(scssPath, [])).rejects.toThrow();
  });
});
