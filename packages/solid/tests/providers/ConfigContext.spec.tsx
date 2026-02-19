import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import { useConfig, ConfigProvider } from "../../src/providers/ConfigContext";

describe("ConfigContext", () => {
  afterEach(() => {
    cleanup();
  });

  describe("useConfig", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useConfig()).toThrow(
          "useConfig는 ConfigProvider 내부에서만 사용할 수 있습니다",
        );
        dispose();
      });
    });
  });

  describe("ConfigProvider", () => {
    it("clientName을 올바르게 제공한다", () => {
      let receivedClientName: string | undefined;

      function TestComponent() {
        const config = useConfig();
        receivedClientName = config.clientName;
        return <div />;
      }

      render(() => (
        <ConfigProvider clientName="myApp">
          <TestComponent />
        </ConfigProvider>
      ));

      expect(receivedClientName).toBe("myApp");
    });
  });
});
