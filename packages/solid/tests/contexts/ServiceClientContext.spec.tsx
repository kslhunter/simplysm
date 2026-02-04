import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useServiceClient } from "../../src/contexts/ServiceClientContext";

describe("ServiceClientContext", () => {
  describe("useServiceClient", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useServiceClient()).toThrow(
          "useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다"
        );
        dispose();
      });
    });
  });
});
