import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { createLogger } from "@simplysm/core-common";
import { SdSystemLogProvider } from "../../../src/core/config/sd-system-log.provider";

type Logger = ReturnType<typeof createLogger>;

describe("Feature 1.8 Slice 1: SdSystemLogProvider", () => {
  let provider: SdSystemLogProvider;
  let logger: Logger;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    provider = TestBed.inject(SdSystemLogProvider);
    logger = (provider as unknown as { _logger: Logger })._logger;
  });

  describe("severity별 로그 기록", () => {
    it("error 심각도로 로그를 기록한다", () => {
      const spy = vi.spyOn(logger, "error").mockImplementation(() => {});
      void provider.writeAsync("error", "에러 발생");
      expect(spy).toHaveBeenCalledWith("에러 발생");
      spy.mockRestore();
    });

    it("warn 심각도로 로그를 기록한다", () => {
      const spy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      void provider.writeAsync("warn", "경고 메시지");
      expect(spy).toHaveBeenCalledWith("경고 메시지");
      spy.mockRestore();
    });

    it("log 심각도로 로그를 기록한다", () => {
      const spy = vi.spyOn(logger, "log").mockImplementation(() => {});
      void provider.writeAsync("log", "일반 로그");
      expect(spy).toHaveBeenCalledWith("일반 로그");
      spy.mockRestore();
    });
  });

  describe("writeFn 동작", () => {
    it("writeFn이 설정되면 추가 호출된다", async () => {
      const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      const writeFn = vi.fn();
      provider.writeFn = writeFn;

      await provider.writeAsync("error", "에러");

      expect(loggerSpy).toHaveBeenCalledWith("에러");
      expect(writeFn).toHaveBeenCalledWith("error", "에러");
      loggerSpy.mockRestore();
    });

    it("writeFn에서 에러가 발생하면 logger.error로 출력한다", async () => {
      const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      const fnError = new Error("writeFn failed");
      provider.writeFn = () => {
        throw fnError;
      };

      await provider.writeAsync("error", "에러");

      expect(loggerSpy).toHaveBeenCalledWith("에러");
      expect(loggerSpy).toHaveBeenCalledWith(fnError);
      loggerSpy.mockRestore();
    });
  });
});
