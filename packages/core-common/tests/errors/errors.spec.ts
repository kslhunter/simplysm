import { describe, it, expect } from "vitest";
import { SdError, ArgumentError, NotImplementError, TimeoutError } from "@simplysm/core-common";

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

  //#region NotImplementError

  describe("NotImplementError", () => {
    it("기본 메시지로 생성한다", () => {
      const error = new NotImplementError();

      expect(error.name).toBe("NotImplementError");
      expect(error.message).toBe("구현되어있지 않습니다");
    });

    it("커스텀 메시지로 생성한다", () => {
      const error = new NotImplementError("custom message");

      // "구현되어있지 않습니다: custom message" 형식
      expect(error.message).toContain("구현되어있지 않습니다");
      expect(error.message).toContain("custom message");
    });
  });

  //#endregion

  //#region TimeoutError

  describe("TimeoutError", () => {
    it("기본 메시지로 생성한다", () => {
      const error = new TimeoutError();

      expect(error.name).toBe("TimeoutError");
      expect(error.message).toContain("대기시간이 초과되었습니다");
    });

    it("millisecond와 함께 생성한다", () => {
      const error = new TimeoutError(5000);

      expect(error.message).toContain("5000ms");
    });

    it("millisecond와 커스텀 메시지로 생성한다", () => {
      const error = new TimeoutError(3000, "custom timeout");

      expect(error.message).toContain("3000ms");
      expect(error.message).toContain("custom timeout");
    });
  });

  //#endregion

  //#region Error inheritance

  describe("Error 상속", () => {
    it("SdError는 Error를 상속한다", () => {
      const error = new SdError("test");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SdError);
    });

    it("ArgumentError는 SdError를 상속한다", () => {
      const error = new ArgumentError("test");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SdError);
      expect(error).toBeInstanceOf(ArgumentError);
    });

    it("NotImplementError는 SdError를 상속한다", () => {
      const error = new NotImplementError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SdError);
      expect(error).toBeInstanceOf(NotImplementError);
    });

    it("TimeoutError는 SdError를 상속한다", () => {
      const error = new TimeoutError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SdError);
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  //#endregion

  //#region Stack trace

  describe("Stack trace", () => {
    it("모든 에러가 스택 트레이스를 가진다", () => {
      const sdError = new SdError("test");
      const argError = new ArgumentError("test");
      const notImplError = new NotImplementError();
      const timeoutError = new TimeoutError();

      expect(sdError.stack).toBeDefined();
      expect(argError.stack).toBeDefined();
      expect(notImplError.stack).toBeDefined();
      expect(timeoutError.stack).toBeDefined();
    });
  });

  //#endregion
});
