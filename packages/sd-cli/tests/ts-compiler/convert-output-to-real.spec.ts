import "@simplysm/sd-core-common";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { describe, expect, it } from "vitest";
import { convertOutputToReal } from "../../src/ts-compiler/convertOutputToReal";

describe("convertOutputToReal", () => {
  // Case: commonSourceDirectory가 packages/ → 출력이 dist/<패키지명>/src/
  it("dist/<패키지명>/src/ 패턴을 dist/로 보정한다", () => {
    const pkgPath = PathUtils.norm("/repo/packages/sd-excel") as TNormPath;
    const distPath = PathUtils.norm("/repo/packages/sd-excel/dist") as TNormPath;
    const filePath = PathUtils.norm("/repo/packages/sd-excel/dist/sd-excel/src/index.js") as TNormPath;

    const result = convertOutputToReal(filePath, distPath, pkgPath, "export default {};");

    expect(result.filePath).toBe(PathUtils.norm("/repo/packages/sd-excel/dist/index.js"));
  });

  // Case: commonSourceDirectory가 패키지 루트 → 출력이 dist/src/
  it("dist/src/ 패턴을 dist/로 보정한다", () => {
    const pkgPath = PathUtils.norm("/repo/packages/capacitor-plugin-intent") as TNormPath;
    const distPath = PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist") as TNormPath;
    const filePath = PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist/src/index.js") as TNormPath;

    const result = convertOutputToReal(filePath, distPath, pkgPath, "export default {};");

    expect(result.filePath).toBe(PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist/index.js"));
  });

  it("dist/src/ 중첩 경로도 보정한다", () => {
    const pkgPath = PathUtils.norm("/repo/packages/capacitor-plugin-intent") as TNormPath;
    const distPath = PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist") as TNormPath;
    const filePath = PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist/src/web/IntentWeb.js") as TNormPath;

    const result = convertOutputToReal(filePath, distPath, pkgPath, "export default {};");

    expect(result.filePath).toBe(PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist/web/IntentWeb.js"));
  });

  // source map 보정
  // dist/sd-excel/src/ → dist/ (2단계 위로 이동)
  // sources: "../../../src/index.ts" → depth가 2 줄어 "../" 2개 제거 → "../src/index.ts"
  it("dist/<패키지명>/src/ 패턴의 source map을 보정한다", () => {
    const pkgPath = PathUtils.norm("/repo/packages/sd-excel") as TNormPath;
    const distPath = PathUtils.norm("/repo/packages/sd-excel/dist") as TNormPath;
    const filePath = PathUtils.norm("/repo/packages/sd-excel/dist/sd-excel/src/index.js.map") as TNormPath;
    const sourceMap = JSON.stringify({ sources: ["../../../src/index.ts"] });

    const result = convertOutputToReal(filePath, distPath, pkgPath, sourceMap);

    const parsed = JSON.parse(result.text);
    expect(parsed.sources[0]).toBe("../src/index.ts");
  });

  // dist/src/ → dist/ (1단계 위로 이동)
  // sources: "../../src/index.ts" → depth가 1 줄어 "../" 1개 제거 → "../src/index.ts"
  it("dist/src/ 패턴의 source map을 보정한다", () => {
    const pkgPath = PathUtils.norm("/repo/packages/capacitor-plugin-intent") as TNormPath;
    const distPath = PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist") as TNormPath;
    const filePath = PathUtils.norm("/repo/packages/capacitor-plugin-intent/dist/src/index.js.map") as TNormPath;
    const sourceMap = JSON.stringify({ sources: ["../../src/index.ts"] });

    const result = convertOutputToReal(filePath, distPath, pkgPath, sourceMap);

    const parsed = JSON.parse(result.text);
    expect(parsed.sources[0]).toBe("../src/index.ts");
  });
});
