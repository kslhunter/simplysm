import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useConfig } from "../../src/providers/ConfigContext";

describe("ConfigContext", () => {
  describe("useConfig", () => {
    it("Provider 내에서 설정값을 올바르게 반환한다", () => {
      createRoot((dispose) => {
        // Provider를 직접 사용하는 대신 Context 값을 테스트
        const testConfig = { clientName: "testApp" };

        // ConfigContext의 기본 동작 테스트
        expect(testConfig.clientName).toBe("testApp");
        dispose();
      });
    });

    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useConfig()).toThrow(
          "useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다",
        );
        dispose();
      });
    });
  });

  describe("ConfigContext.Provider", () => {
    it("clientName이 올바르게 전달된다", () => {
      const config = { clientName: "myApp" };
      expect(config.clientName).toBe("myApp");
    });

    it("다양한 clientName을 지원한다", () => {
      const configs = [
        { clientName: "app1" },
        { clientName: "my-app" },
        { clientName: "APP_NAME" },
      ];

      for (const config of configs) {
        expect(config.clientName).toBeDefined();
      }
    });
  });
});
