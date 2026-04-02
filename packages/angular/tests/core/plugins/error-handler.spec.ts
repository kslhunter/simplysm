import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef, ErrorHandler } from "@angular/core";
import { SdGlobalErrorHandlerPlugin } from "../../../src/core/plugins/sd-global-error-handler.plugin";
import { SdSystemLogProvider } from "../../../src/core/providers/sd-system-log.provider";

describe("Feature 1.5 Slice 3: SdGlobalErrorHandlerPlugin", () => {
  let handler: SdGlobalErrorHandlerPlugin;
  let overlayElements: Element[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }],
    });
    handler = TestBed.inject(ErrorHandler) as SdGlobalErrorHandlerPlugin;
    overlayElements = [];
  });

  afterEach(() => {
    // cleanup overlays
    for (const el of overlayElements) {
      el.remove();
    }
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  describe("Error 객체 처리", () => {
    it("Error를 handleError에 전달하면 에러 오버레이가 생성된다", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const destroySpy = vi.spyOn(TestBed.inject(ApplicationRef), "destroy").mockImplementation(() => {});

      handler.handleError(new Error("test error"));

      expect(consoleSpy).toHaveBeenCalled();
      const overlay = document.querySelector("div[style*='position: fixed']");
      expect(overlay).not.toBeNull();
      expect(overlay!.textContent).toContain("test error");

      consoleSpy.mockRestore();
      destroySpy.mockRestore();
    });
  });

  describe("ErrorEvent 처리", () => {
    it("error가 null인 ErrorEvent는 console.warn만 호출한다", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const errorEvent = new ErrorEvent("error", { message: "test warning" });
      handler.handleError(errorEvent);

      expect(warnSpy).toHaveBeenCalledWith("test warning");
      const overlay = document.querySelector("div[style*='position: fixed']");
      expect(overlay).toBeNull();

      warnSpy.mockRestore();
    });
  });
});

describe("FIX-1 Slice 2: 에러 핸들러 강화", () => {
  let handler: SdGlobalErrorHandlerPlugin;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }],
    });
    handler = TestBed.inject(ErrorHandler) as SdGlobalErrorHandlerPlugin;
  });

  afterEach(() => {
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  it("문자열 에러가 처리되어 오버레이에 표시된다", () => {
    const destroySpy = vi.spyOn(TestBed.inject(ApplicationRef), "destroy").mockImplementation(() => {});

    handler.handleError("문자열 에러 메시지");

    const overlay = document.querySelector("div[style*='position: fixed']");
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent).toContain("문자열 에러 메시지");

    destroySpy.mockRestore();
  });

  it("에러 메시지에 HTML이 포함되어도 XSS가 발생하지 않는다 (textContent 사용)", () => {
    const destroySpy = vi.spyOn(TestBed.inject(ApplicationRef), "destroy").mockImplementation(() => {});

    handler.handleError(new Error('<script>alert("xss")</script>'));

    const overlay = document.querySelector("div[style*='position: fixed']");
    expect(overlay).not.toBeNull();
    // innerHTML에 <script> 태그가 실제 스크립트 요소로 존재하지 않아야 한다
    const scriptEl = overlay!.querySelector("script");
    expect(scriptEl).toBeNull();
    // 텍스트로 표시되어야 한다
    expect(overlay!.textContent).toContain('<script>alert("xss")</script>');

    destroySpy.mockRestore();
  });
});

describe("Feature 1.1 Slice 5: 오버레이 중복 방지", () => {
  let handler: SdGlobalErrorHandlerPlugin;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }],
    });
    handler = TestBed.inject(ErrorHandler) as SdGlobalErrorHandlerPlugin;
  });

  afterEach(() => {
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  it("에러가 연속 발생해도 오버레이가 중복 생성되지 않는다", () => {
    const destroySpy = vi
      .spyOn(TestBed.inject(ApplicationRef), "destroy")
      .mockImplementation(() => {});

    handler.handleError(new Error("first error"));
    handler.handleError(new Error("second error"));

    const overlays = document.querySelectorAll("div[style*='position: fixed']");
    expect(overlays.length).toBe(1);
    expect(overlays[0].textContent).toContain("first error");

    destroySpy.mockRestore();
  });
});

describe("Feature 2.3 Slice 1: 에러 핸들러 수정", () => {
  let handler: SdGlobalErrorHandlerPlugin;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }],
    });
    handler = TestBed.inject(ErrorHandler) as SdGlobalErrorHandlerPlugin;
  });

  afterEach(() => {
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
    document.body.textContent = "";
  });

  describe("Rule: PromiseRejectionEvent의 reason이 primitive 타입일 때 에러 정보를 표시한다", () => {
    it("reason이 undefined인 경우 에러 오버레이에 'undefined' 텍스트가 포함된다", () => {
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});

      const event = new PromiseRejectionEvent("unhandledrejection", {
        reason: undefined,
        promise: Promise.resolve(),
      });
      handler.handleError(event);

      const overlay = document.querySelector("div[style*='position: fixed']");
      expect(overlay).not.toBeNull();
      expect(overlay!.textContent).toContain("undefined");

      destroySpy.mockRestore();
    });

    it("reason이 number인 경우 에러 오버레이에 '42' 텍스트가 포함된다", () => {
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});

      const event = new PromiseRejectionEvent("unhandledrejection", {
        reason: 42,
        promise: Promise.resolve(),
      });
      handler.handleError(event);

      const overlay = document.querySelector("div[style*='position: fixed']");
      expect(overlay).not.toBeNull();
      expect(overlay!.textContent).toContain("42");

      destroySpy.mockRestore();
    });

    it("reason이 symbol인 경우 에러 오버레이에 'Symbol(test)' 텍스트가 포함된다", () => {
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});

      const event = new PromiseRejectionEvent("unhandledrejection", {
        reason: Symbol("test"),
        promise: Promise.resolve(),
      });
      handler.handleError(event);

      const overlay = document.querySelector("div[style*='position: fixed']");
      expect(overlay).not.toBeNull();
      expect(overlay!.textContent).toContain("Symbol(test)");

      destroySpy.mockRestore();
    });
  });

  describe("Rule: _displayErrorMessage 실패 시 폴백 에러 메시지를 제공한다", () => {
    it("DOM append 중 예외 발생 시 document.body에 원본 및 2차 에러 정보가 표시된다", () => {
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const appendSpy = vi.spyOn(document.body, "append").mockImplementation(() => {
        throw new Error("DOM append failed");
      });

      handler.handleError(new Error("original error"));

      expect(document.body.textContent).toContain("original error");
      expect(document.body.textContent).toContain("DOM append failed");

      appendSpy.mockRestore();
      consoleSpy.mockRestore();
      destroySpy.mockRestore();
    });
  });
});

describe("Feature 1.8 Slice 3: SdGlobalErrorHandlerPlugin + SdSystemLogProvider 연동", () => {
  let handler: SdGlobalErrorHandlerPlugin;
  let systemLog: SdSystemLogProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin }],
    });
    handler = TestBed.inject(ErrorHandler) as SdGlobalErrorHandlerPlugin;
    systemLog = TestBed.inject(SdSystemLogProvider);
  });

  afterEach(() => {
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  it("Error 발생 시 SdSystemLogProvider.writeAsync로 에러 로그를 기록한다", () => {
    const writeAsyncSpy = vi.spyOn(systemLog, "writeAsync").mockResolvedValue();
    const destroySpy = vi
      .spyOn(TestBed.inject(ApplicationRef), "destroy")
      .mockImplementation(() => {});

    handler.handleError(new Error("test error"));

    expect(writeAsyncSpy).toHaveBeenCalledWith("error", expect.stringContaining("test error"));

    writeAsyncSpy.mockRestore();
    destroySpy.mockRestore();
  });

  it("PromiseRejectionEvent 발생 시 SdSystemLogProvider.writeAsync로 에러 로그를 기록한다", () => {
    const writeAsyncSpy = vi.spyOn(systemLog, "writeAsync").mockResolvedValue();
    const destroySpy = vi
      .spyOn(TestBed.inject(ApplicationRef), "destroy")
      .mockImplementation(() => {});

    handler.handleError(new PromiseRejectionEvent("unhandledrejection", {
      reason: new Error("promise error"),
      promise: Promise.resolve(),
    }));

    expect(writeAsyncSpy).toHaveBeenCalledWith("error", expect.stringContaining("promise error"));

    writeAsyncSpy.mockRestore();
    destroySpy.mockRestore();
  });

  it("ErrorEvent의 error가 null이면 SdSystemLogProvider.writeAsync로 warn 로그를 기록한다", () => {
    const writeAsyncSpy = vi.spyOn(systemLog, "writeAsync").mockResolvedValue();

    handler.handleError(new ErrorEvent("error", { message: "test warning" }));

    expect(writeAsyncSpy).toHaveBeenCalledWith("warn", "test warning");

    writeAsyncSpy.mockRestore();
  });
});
