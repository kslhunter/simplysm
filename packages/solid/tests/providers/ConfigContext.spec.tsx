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
    it("throws error when used without Provider", () => {
      createRoot((dispose) => {
        expect(() => useConfig()).toThrow(
          "useConfig can only be used inside ConfigProvider",
        );
        dispose();
      });
    });
  });

  describe("ConfigProvider", () => {
    it("provides clientName correctly", () => {
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
