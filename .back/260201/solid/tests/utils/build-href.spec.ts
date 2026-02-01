import { describe, it, expect, afterEach } from "vitest";
import { buildHref } from "../../src/utils/build-href";

describe("buildHref", () => {
  const originalHref = window.location.href;

  afterEach(() => {
    // 원래 URL로 복원
    window.history.replaceState(null, "", originalHref);
  });

  describe("HashRouter 환경", () => {
    it("hash 경로를 올바르게 생성한다", () => {
      // 현재 origin에 hash 경로 설정
      const origin = window.location.origin;
      window.history.replaceState(null, "", `${origin}/#/home`);

      const result = buildHref("/settings");
      expect(result).toBe(`${origin}/#/settings`);
    });

    it("중첩 경로도 올바르게 처리한다", () => {
      const origin = window.location.origin;
      window.history.replaceState(null, "", `${origin}/#/admin/users`);

      const result = buildHref("/admin/roles");
      expect(result).toBe(`${origin}/#/admin/roles`);
    });

    it("hash가 '#/'만 있어도 HashRouter로 감지한다", () => {
      const origin = window.location.origin;
      window.history.replaceState(null, "", `${origin}/#/`);

      const result = buildHref("/settings");
      expect(result).toBe(`${origin}/#/settings`);
    });

    it("hash가 '#'만 있는 경우 BrowserRouter로 처리한다", () => {
      const origin = window.location.origin;
      // "#"만 있는 경우는 HashRouter 초기화 전 상태일 수 있으나,
      // 일반적인 HashRouter는 "#/"로 시작하므로 BrowserRouter로 처리
      window.history.replaceState(null, "", `${origin}/#`);

      const result = buildHref("/settings");
      // hash가 "#"만 있는 경우 window.location.hash는 빈 문자열이 됨
      expect(result).toBe(`${origin}/settings`);
    });
  });

  describe("BrowserRouter 환경", () => {
    it("일반 경로를 올바르게 생성한다", () => {
      const origin = window.location.origin;
      window.history.replaceState(null, "", `${origin}/home`);

      const result = buildHref("/settings");
      expect(result).toBe(`${origin}/settings`);
    });

    it("루트 경로를 올바르게 처리한다", () => {
      const origin = window.location.origin;
      window.history.replaceState(null, "", `${origin}/`);

      const result = buildHref("/about");
      expect(result).toBe(`${origin}/about`);
    });

    it("앵커 링크가 있는 BrowserRouter 경로를 HashRouter로 오인하지 않는다", () => {
      const origin = window.location.origin;
      // BrowserRouter 경로에 앵커가 있는 경우 (예: /page#section)
      window.history.replaceState(null, "", `${origin}/page#section`);

      const result = buildHref("/settings");
      // 이 경우 BrowserRouter로 처리해야 함 (hash가 "/"로 시작하지 않음)
      expect(result).toBe(`${origin}/settings`);
    });

    it("쿼리 파라미터가 있어도 올바르게 처리한다", () => {
      const origin = window.location.origin;
      window.history.replaceState(null, "", `${origin}/page?query=value`);

      const result = buildHref("/settings");
      expect(result).toBe(`${origin}/settings`);
    });
  });
});
