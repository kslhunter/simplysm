import { describe, it, expect, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { getHmrClientScript, createHmrPostTransform } from "../../src/dev-server/hmr-client-script";

describe("HMR 클라이언트 스크립트 통합", () => {
  describe("Scenario: HMR 클라이언트 문법 호환성", () => {
    it("Chrome 61 비호환 문법을 사용하지 않는다", () => {
      const script = getHmrClientScript("/app/", 4200);

      // optional chaining (?.) 미사용
      expect(script).not.toMatch(/\?\./);
      // nullish coalescing (??) 미사용
      expect(script).not.toMatch(/\?\?/);
      // logical assignment (&&=, ||=, ??=) 미사용
      expect(script).not.toMatch(/&&=|(\|\|=)|(\?\?=)/);
    });

    it("WebSocket 연결 코드를 포함한다", () => {
      const script = getHmrClientScript("/app/", 4200);
      expect(script).toContain("WebSocket");
      expect(script).toContain("ws://");
    });

    it("component-update, css-update, full-reload 메시지 핸들러를 포함한다", () => {
      const script = getHmrClientScript("/app/", 4200);
      expect(script).toContain("component-update");
      expect(script).toContain("css-update");
      expect(script).toContain("full-reload");
      expect(script).toContain("__hmr_dispatch");
      expect(script).toContain("location.reload");
    });

    it("자동 재연결 로직을 포함한다", () => {
      const script = getHmrClientScript("/app/", 4200);
      expect(script).toContain("setTimeout");
      expect(script).toContain("connect");
    });
  });

  describe("Scenario: css-update 메시지의 files와 매칭되는 link만 업데이트", () => {
    function createScriptEnv() {
      let wsOnMessage: ((e: { data: string }) => void) | undefined;
      const mainLink = {
        getAttribute: vi.fn(() => "/app/main.css?t=old"),
        setAttribute: vi.fn(),
      };
      const vendorLink = {
        getAttribute: vi.fn(() => "/app/vendor.css"),
        setAttribute: vi.fn(),
      };

      const sandbox = {
        WebSocket: function MockWebSocket() {
          Object.defineProperty(this, "onmessage", {
            set(fn: (e: { data: string }) => void) {
              wsOnMessage = fn;
            },
          });
          Object.defineProperty(this, "onclose", { set() {} });
        },
        document: { querySelectorAll: vi.fn(() => [mainLink, vendorLink]) },
        location: { hostname: "localhost", port: "3000", reload: vi.fn() },
        setTimeout: vi.fn(),
        globalThis: {} as Record<string, unknown>,
        JSON,
      };
      sandbox.globalThis = sandbox as Record<string, unknown>;

      return {
        sandbox,
        triggerMessage: (msg: Record<string, unknown>) => {
          wsOnMessage!({ data: JSON.stringify(msg) });
        },
        mainLink,
        vendorLink,
      };
    }

    it("css-update 시 msg.files와 매칭되는 link만 cache-busting 적용", () => {
      const script = getHmrClientScript("/app/", 4200);
      const { sandbox, triggerMessage, mainLink, vendorLink } = createScriptEnv();

      runInNewContext(script, sandbox);

      triggerMessage({ type: "css-update", files: ["main.css"], timestamp: 12345 });

      expect(mainLink.setAttribute).toHaveBeenCalledWith("href", "/app/main.css?t=12345");
      expect(vendorLink.setAttribute).not.toHaveBeenCalled();
    });

    it("css-update 시 files에 여러 파일이 있으면 매칭되는 모든 link를 업데이트", () => {
      const script = getHmrClientScript("/app/", 4200);
      const { sandbox, triggerMessage, mainLink, vendorLink } = createScriptEnv();

      runInNewContext(script, sandbox);

      triggerMessage({
        type: "css-update",
        files: ["main.css", "vendor.css"],
        timestamp: 99999,
      });

      expect(mainLink.setAttribute).toHaveBeenCalled();
      expect(vendorLink.setAttribute).toHaveBeenCalled();
    });
  });

  describe("Scenario: 스크립트 주입", () => {
    it("postTransform이 </body> 직전에 script 태그를 삽입한다", async () => {
      const transform = createHmrPostTransform("/app/", 4200);
      const html = "<html><body><div>content</div></body></html>";
      const result = await transform(html);

      expect(result).toContain("<script>");
      expect(result).toContain("</script></body>");
      expect(result).toContain("WebSocket");
    });

    it("</body>가 없는 HTML에서도 스크립트를 추가한다", async () => {
      const transform = createHmrPostTransform("/app/", 4200);
      const html = "<html><body><div>content</div>";
      const result = await transform(html);

      expect(result).toContain("<script>");
      expect(result).toContain("WebSocket");
    });
  });
});
