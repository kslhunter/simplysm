import { describe, it, expect } from "vitest";
import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixture");
const ENTRY = path.join(FIXTURE_DIR, "entry.js");

describe("esbuild define env 주입 통합 테스트", () => {
  it("import.meta.env spread에 define 값이 인라인된다", async () => {
    const result = await esbuild.build({
      entryPoints: [ENTRY],
      bundle: true,
      format: "esm",
      write: false,
      define: {
        "import.meta.env": JSON.stringify({ DEV: "true", VER: "1.0.0" }),
      },
    });

    const code = result.outputFiles[0].text;
    const codeWithoutComments = code.replace(/\/\/.*$/gm, "");

    // import.meta.env가 실제 값으로 치환됨 (주석 제외 코드에서 확인)
    expect(codeWithoutComments).not.toContain("import.meta.env");
    expect(code).toContain("true");
    expect(code).toContain("1.0.0");
  });

  it("빈 define 객체이면 import.meta.env가 빈 객체로 치환된다", async () => {
    const result = await esbuild.build({
      entryPoints: [ENTRY],
      bundle: true,
      format: "esm",
      write: false,
      define: {
        "import.meta.env": JSON.stringify({}),
      },
    });

    const code = result.outputFiles[0].text;
    const codeWithoutComments = code.replace(/\/\/.*$/gm, "");

    expect(codeWithoutComments).not.toContain("import.meta.env");
  });
});
