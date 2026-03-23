import { describe, expect, it } from "vitest";
import { SdPolyfillPlugin } from "../../src/pkg-builders/client/SdPolyfillPlugin";

function captureOnLoad(browserslistQuery: string[]) {
  const plugin = SdPolyfillPlugin(browserslistQuery);

  let onLoadHandler: (() => { contents: string; loader: string; resolveDir?: string }) | undefined;
  const mockBuild = {
    onResolve: () => {},
    onLoad: (_opts: unknown, handler: () => { contents: string; loader: string; resolveDir?: string }) => {
      onLoadHandler = handler;
    },
  };

  plugin.setup(mockBuild as never);
  return onLoadHandler!();
}

describe("SdPolyfillPlugin", () => {
  describe("가상 polyfill 모듈의 import가 OS 무관하게 resolve되어야 한다", () => {
    it("모든 import가 bare specifier이다 (절대 경로 없음)", () => {
      const result = captureOnLoad(["Chrome >= 61"]);
      const importLines = result.contents.split("\n").filter((l) => l.startsWith("import"));

      expect(importLines.length).toBeGreaterThan(0);
      for (const line of importLines) {
        expect(line).not.toMatch(/["'][A-Z]:\//i); // Windows 드라이브 문자 금지
        expect(line).not.toMatch(/["']\//); // Unix 절대 경로 금지
      }
      // core-js bare specifier 사용
      expect(result.contents).toContain('import "core-js/modules/');
    });

    it("abortcontroller-polyfill import에 절대 경로가 포함되지 않는다", () => {
      const result = captureOnLoad(["Chrome >= 61"]);

      expect(result.contents).toContain("abortcontroller-polyfill");
      // 절대 경로가 아닌 bare specifier
      const abortLines = result.contents.split("\n").filter((l) => l.includes("abortcontroller"));
      for (const line of abortLines) {
        expect(line).not.toMatch(/[A-Z]:\//i);
      }
    });

    it("resize-observer-polyfill import에 절대 경로가 포함되지 않는다", () => {
      const result = captureOnLoad(["Chrome >= 61"]);

      expect(result.contents).toContain("resize-observer-polyfill");
      const roLines = result.contents.split("\n").filter((l) => l.includes("resize-observer"));
      for (const line of roLines) {
        expect(line).not.toMatch(/[A-Z]:\//i);
      }
    });

    it("resolveDir이 설정되어야 한다", () => {
      const result = captureOnLoad(["Chrome >= 61"]);

      expect(result.resolveDir).toBeDefined();
      expect(typeof result.resolveDir).toBe("string");
      expect(result.resolveDir!.length).toBeGreaterThan(0);
    });
  });

  describe("core-js-compat 기반 동적 polyfill 목록이 유지되어야 한다", () => {
    it("browserslistQuery에 따라 core-js 모듈이 포함된다", () => {
      const result = captureOnLoad(["Chrome >= 61"]);

      // Chrome 61에서 지원하지 않는 ES feature가 포함되어야 함
      expect(result.contents).toContain("core-js/modules/");
    });

    it("존재하지 않는 모듈은 skip되고 에러 없이 완료된다", () => {
      // core-js-compat이 반환하는 모듈 중 실제 존재하지 않는 것이 있어도 에러 없이 완료
      expect(() => captureOnLoad(["Chrome >= 61"])).not.toThrow();
    });
  });
});
