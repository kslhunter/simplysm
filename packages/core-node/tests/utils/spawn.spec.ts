import { describe, expect, it } from "vitest";
import { resolveStdioPipe } from "../../src/utils/cp";

describe("resolveStdioPipe", () => {
  it("문자열 'pipe' → stdout/stderr 모두 true", () => {
    expect(resolveStdioPipe("pipe")).toEqual({ stdout: true, stderr: true });
  });

  it("문자열 'inherit' → 모두 false", () => {
    expect(resolveStdioPipe("inherit")).toEqual({ stdout: false, stderr: false });
  });

  it("문자열 'ignore' → 모두 false", () => {
    expect(resolveStdioPipe("ignore")).toEqual({ stdout: false, stderr: false });
  });

  it("undefined → 모두 true (기본값 pipe)", () => {
    expect(resolveStdioPipe(undefined)).toEqual({ stdout: true, stderr: true });
  });

  it("배열 [ignore, pipe, inherit] → stdout만 true", () => {
    expect(resolveStdioPipe(["ignore", "pipe", "inherit"])).toEqual({
      stdout: true,
      stderr: false,
    });
  });

  it("배열 [ignore, inherit, pipe] → stderr만 true", () => {
    expect(resolveStdioPipe(["ignore", "inherit", "pipe"])).toEqual({
      stdout: false,
      stderr: true,
    });
  });

  it("배열 [pipe, pipe, pipe] → 모두 true", () => {
    expect(resolveStdioPipe(["pipe", "pipe", "pipe"])).toEqual({
      stdout: true,
      stderr: true,
    });
  });

  it("배열 [ignore, inherit, inherit] → 모두 false", () => {
    expect(resolveStdioPipe(["ignore", "inherit", "inherit"])).toEqual({
      stdout: false,
      stderr: false,
    });
  });
});
