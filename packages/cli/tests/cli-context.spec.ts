import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// pino 모킹
vi.mock("pino", () => ({
  default: vi.fn((options: { name?: string; level?: string }) => ({
    name: options.name,
    level: options.level ?? "info",
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

// ora 모킹
const mockOraInstance = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  stop: vi.fn().mockReturnThis(),
  text: "",
};
vi.mock("ora", () => ({
  default: vi.fn(() => mockOraInstance),
}));

import pino from "pino";
import ora from "ora";
import { createCliContext } from "../src/utils/cli-context";

describe("createCliContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debug 모드에서 로거 레벨이 debug이고 스피너가 undefined", () => {
    const result = createCliContext("test-logger", true, "초기 텍스트");

    // pino가 debug 레벨로 호출됨
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test-logger",
        level: "debug",
      }),
    );

    // 스피너는 생성되지 않음
    expect(ora).not.toHaveBeenCalled();
    expect(result.spinner).toBeUndefined();

    // 로거는 반환됨
    expect(result.logger).toBeDefined();
  });

  it("일반 모드에서 로거 레벨이 silent이고 스피너가 활성화됨", () => {
    const result = createCliContext("test-logger", false, "초기 텍스트");

    // pino가 silent 레벨로 호출됨
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test-logger",
        level: "silent",
      }),
    );

    // 스피너가 생성되고 start 호출됨
    expect(ora).toHaveBeenCalledWith("초기 텍스트");
    expect(mockOraInstance.start).toHaveBeenCalled();
    expect(result.spinner).toBeDefined();
  });

  it("로거 이름이 올바르게 설정됨", () => {
    createCliContext("sd-cli:lint", false, "린트 준비 중...");

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "sd-cli:lint",
      }),
    );
  });

  it("debug 모드에서 pino-pretty transport 설정됨", () => {
    createCliContext("test-logger", true, "초기 텍스트");

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: { target: "pino-pretty" },
      }),
    );
  });

  it("일반 모드에서 transport 설정이 undefined", () => {
    createCliContext("test-logger", false, "초기 텍스트");

    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: undefined,
      }),
    );
  });
});
