import { describe, expect, it } from "vitest";
import { err } from "../../src/index";

describe("err utils", () => {
  it("message는 Error의 message만 반환한다", () => {
    const error = new Error("boom");
    expect(err.message(error)).toBe("boom");
  });

  it("stack은 Error의 stack을 우선 반환한다", () => {
    const error = new Error("boom");
    error.stack = "STACK\n at test";
    expect(err.stack(error)).toBe("STACK\n at test");
  });

  it("stack이 없는 Error는 message를 반환한다", () => {
    const error = new Error("boom");
    error.stack = undefined;
    expect(err.stack(error)).toBe("boom");
  });

  it("Error가 아닌 값은 문자열로 반환한다", () => {
    expect(err.message("plain")).toBe("plain");
    expect(err.stack("plain")).toBe("plain");
  });
});
