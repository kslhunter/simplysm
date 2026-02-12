import { describe, it, expect } from "vitest";
import { SdError, ArgumentError, NotImplementedError, TimeoutError } from "@simplysm/core-common";

describe("Errors", () => {
  //#region SdError

  describe("SdError", () => {
    it("메시지로 생성한다", () => {
      const error = new SdError("test message");

      expect(error.message).toBe("test message");
      expect(error.name).toBe("SdError");
    });

    it("cause와 함께 생성한다", () => {
      const cause = new Error("original error");
      const error = new SdError(cause, "wrapped message");

      // 메시지는 "wrapped message => original error" 형식으로 결합됨
      expect(error.message).toContain("wrapped message");
      expect(error.message).toContain("original error");
    });

    it("cause 메시지를 통합한다", () => {
      const cause = new Error("cause message");
      const error = new SdError(cause, "main message");

      expect(error.message).toContain("main message");
    });

    it("다단계 cause 체인을 처리한다", () => {
      const root = new Error("root error");
      const middle = new SdError(root, "middle error");
      const top = new SdError(middle, "top error");

      expect(top.message).toContain("top error");
      expect(top.message).toContain("middle error");
      expect(top.message).toContain("root error");
    });

    it("cause의 스택을 현재 스택에 통합한다", () => {
      const cause = new Error("cause error");
      const error = new SdError(cause, "main error");

      expect(error.stack).toContain("---- cause stack ----");
      expect(error.stack).toContain(cause.stack);
    });

    it("non-Error 객체를 cause로 전달하면 String()으로 변환한다", () => {
      // 숫자
      const errorFromNumber = new SdError(42, "number cause");
      expect(errorFromNumber.message).toContain("42");

      // 객체
      const errorFromObject = new SdError({ code: 500, reason: "server error" }, "object cause");
      expect(errorFromObject.message).toContain("object cause");

      // null/undefined
      const errorFromNull = new SdError(null, "null cause");
      expect(errorFromNull.message).toContain("null cause");
    });
  });

  //#endregion

  //#region ArgumentError

  describe("ArgumentError", () => {
    it("메시지로 생성한다", () => {
      const error = new ArgumentError("invalid argument");

      expect(error.message).toBe("invalid argument");
      expect(error.name).toBe("ArgumentError");
    });

    it("argObj와 함께 생성한다", () => {
      const error = new ArgumentError("invalid argument", { param: "value", expected: "string" });

      // YAML 형식으로 argObj가 메시지에 포함됨
      expect(error.message).toContain("invalid argument");
      expect(error.message).toContain("param");
      expect(error.message).toContain("value");
    });

    it("메시지 없이 argObj만으로 생성한다", () => {
      const error = new ArgumentError({ key: "value" });

      expect(error.message).toContain("인수가 잘못되었습니다");
      expect(error.message).toContain("key");
    });
  });

  //#endregion

  //#region NotImplementedError

  describe("NotImplementedError", () => {
    it("기본 메시지로 생성한다", () => {
      const error = new NotImplementedError();

      expect(error.name).toBe("NotImplementedError");
      expect(error.message).toBe("구현되어 있지 않습니다");
    });

    it("커스텀 메시지로 생성한다", () => {
      const error = new NotImplementedError("custom message");

      // "구현되어 있지 않습니다: custom message" 형식
      expect(error.message).toContain("구현되어 있지 않습니다");
      expect(error.message).toContain("custom message");
    });
  });

  //#endregion

  //#region TimeoutError

  describe("TimeoutError", () => {
    it("기본 메시지로 생성한다", () => {
      const error = new TimeoutError();

      expect(error.name).toBe("TimeoutError");
      expect(error.message).toContain("대기 시간이 초과되었습니다");
    });

    it("시도 횟수와 함께 생성한다", () => {
      const error = new TimeoutError(5);

      expect(error.message).toContain("5회");
    });

    it("시도 횟수와 커스텀 메시지로 생성한다", () => {
      const error = new TimeoutError(3, "custom timeout");

      expect(error.message).toContain("3회");
      expect(error.message).toContain("custom timeout");
    });
  });

  //#endregion
});
