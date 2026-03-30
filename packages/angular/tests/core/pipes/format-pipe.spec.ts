import { beforeEach, describe, it, expect } from "vitest";
import { FormatPipe } from "../../../src/core/pipes/format.pipe";
import { DateTime, DateOnly } from "@simplysm/core-common";

describe("Feature 1.7 Slice 1: 독립 유틸리티", () => {
  describe("Rule: FormatPipe가 값을 지정된 형식으로 변환한다", () => {
    let pipe: FormatPipe;

    beforeEach(() => {
      pipe = new FormatPipe();
    });

    it("DateTime 값 포맷", () => {
      const dt = DateTime.parse("2024-01-15T10:30:00");
      const result = pipe.transform(dt, "yyyy-MM-dd");
      expect(result).toBe("2024-01-15");
    });

    it("DateOnly 값 포맷", () => {
      const d = DateOnly.parse("2024-01-15");
      const result = pipe.transform(d, "yyyy-MM-dd");
      expect(result).toBe("2024-01-15");
    });

    it("문자열 패턴 포맷", () => {
      const result = pipe.transform("01012345678", "XXX-XXXX-XXXX");
      expect(result).toBe("010-1234-5678");
    });

    it("다중 포맷 중 길이 매칭", () => {
      const result = pipe.transform("0212345678", "XX-XXXX-XXXX|XXX-XXXX-XXXX");
      expect(result).toBe("02-1234-5678");
    });

    it("문자열 길이 불일치 시 원본 반환", () => {
      const result = pipe.transform("ABC", "XXXX-XXXX");
      expect(result).toBe("ABC");
    });

    it("null 또는 undefined 입력 시 빈 문자열", () => {
      expect(pipe.transform(undefined, "yyyy-MM-dd")).toBe("");
    });
  });
});
