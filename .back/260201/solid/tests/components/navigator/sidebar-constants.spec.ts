import { describe, it, expect } from "vitest";
import {
  MOBILE_BREAKPOINT,
  MOBILE_BREAKPOINT_PX,
} from "../../../src/components/navigator/sidebar/sidebar-constants";

describe("sidebar-constants", () => {
  describe("MOBILE_BREAKPOINT_PX", () => {
    it("520 픽셀 값을 가진다", () => {
      expect(MOBILE_BREAKPOINT_PX).toBe(520);
    });

    it("숫자 타입이다", () => {
      expect(typeof MOBILE_BREAKPOINT_PX).toBe("number");
    });
  });

  describe("MOBILE_BREAKPOINT", () => {
    it("'520px' 문자열 값을 가진다", () => {
      expect(MOBILE_BREAKPOINT).toBe("520px");
    });

    it("문자열 타입이다", () => {
      expect(typeof MOBILE_BREAKPOINT).toBe("string");
    });

    it("MOBILE_BREAKPOINT_PX와 일관된 값을 가진다", () => {
      expect(MOBILE_BREAKPOINT).toBe(`${MOBILE_BREAKPOINT_PX}px`);
    });
  });
});
