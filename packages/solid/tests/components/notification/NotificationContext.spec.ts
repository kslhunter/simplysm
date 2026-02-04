import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useNotification } from "../../../src/components/notification/NotificationContext";

describe("NotificationContext", () => {
  describe("useNotification", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useNotification()).toThrow(
          "useNotification must be used within NotificationProvider"
        );
        dispose();
      });
    });
  });
});
