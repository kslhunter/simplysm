import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef, ErrorHandler } from "@angular/core";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { IMAGE_CONFIG } from "@angular/common";
import { SwUpdate } from "@angular/service-worker";
import { Router, NavigationStart, NavigationEnd } from "@angular/router";
import { Subject } from "rxjs";
import { provideSdAngular } from "../src/core/provideSdAngular";
import { SdAngularConfigProvider } from "../src/core/config/sd-angular-config.provider";
import { SdGlobalErrorHandlerPlugin } from "../src/core/error-handler/sd-global-error-handler.plugin";
import { SdOptionEventPlugin } from "../src/core/events/sd-option-event.plugin";
import { SdThemeProvider } from "../src/features/theme/sd-theme-provider";
import { SdLocalStorageProvider } from "../src/core/config/sd-local-storage.provider";
import { SdBusyProvider } from "../src/core/busy/sd-busy.provider";

describe("Feature 1.10 Slice 1: provideSdAngular + commons", () => {
  afterEach(() => {
    localStorage.clear();
    document.body.className = "";
    document.documentElement.style.fontSize = "";
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  // ── Rule 1: 일괄 등록 ──

  describe("Rule: provideSdAngular가 플러그인, 프로바이더, 설정을 일괄 등록한다", () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
    });

    it("clientName이 빈 문자열이어도 SdAngularConfigProvider에 설정된다", () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "" })],
      });
      const config = TestBed.inject(SdAngularConfigProvider);
      expect(config.clientName).toBe("");
    });

    it("앱 부트스트랩 시 모든 프로바이더와 플러그인이 등록된다", () => {
      const config = TestBed.inject(SdAngularConfigProvider);
      expect(config.clientName).toBe("test-app");

      const errorHandler = TestBed.inject(ErrorHandler);
      expect(errorHandler).toBeInstanceOf(SdGlobalErrorHandlerPlugin);

      const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
      const pluginClasses = plugins.map((p) => p.constructor);
      expect(pluginClasses).toContain(SdOptionEventPlugin);

      const imageConfig = TestBed.inject(IMAGE_CONFIG);
      expect(imageConfig.disableImageSizeWarning).toBe(true);
      expect(imageConfig.disableImageLazyLoadWarning).toBe(true);
    });

    it("clientName이 SdLocalStorageProvider의 키 프리픽스로 사용된다", () => {
      const sdLocalStorage = TestBed.inject(SdLocalStorageProvider);
      sdLocalStorage.set("test-key", "test-value");
      const stored = window.localStorage.getItem("test-app.test-key");
      expect(stored).toBe(JSON.stringify("test-value"));
    });
  });

  // ── Rule 3: 테마 복원, 저장 ──

  describe("Rule: 앱 시작 시 localStorage에서 테마를 복원하고 변경을 자동 저장한다", () => {
    it("localStorage에 테마 설정이 있으면 복원한다", () => {
      window.localStorage.setItem("test-app.sd-theme", JSON.stringify("ide-dark"));
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);

      const theme = TestBed.inject(SdThemeProvider);
      expect(theme.theme()).toBe("ide-dark");
    });

    it("localStorage에 테마 설정이 없으면 기본값을 유지한다", () => {
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);

      const theme = TestBed.inject(SdThemeProvider);
      expect(theme.theme()).toBe("light");
    });

    it("테마 변경 시 localStorage에 자동 저장된다", () => {
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);

      const theme = TestBed.inject(SdThemeProvider);
      theme.theme.set("ide-dark");
      TestBed.flushEffects();

      const stored = window.localStorage.getItem("test-app.sd-theme");
      expect(stored).toBe(JSON.stringify("ide-dark"));
    });
  });

  // ── Rule 4: 전역 에러 리스너 ──

  describe("Rule: 전역 에러 리스너가 window-level 에러를 ErrorHandler로 전달한다", () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      TestBed.inject(ApplicationRef);
    });

    it("unhandled promise rejection이 ErrorHandler로 전달된다", () => {
      const errorHandler = TestBed.inject(ErrorHandler);
      const handleErrorSpy = vi.spyOn(errorHandler, "handleError").mockImplementation(() => {});
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});

      const event = new PromiseRejectionEvent("unhandledrejection", {
        reason: new Error("test rejection"),
        promise: Promise.resolve(),
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(handleErrorSpy).toHaveBeenCalledWith(event);
      expect(event.defaultPrevented).toBe(true);

      handleErrorSpy.mockRestore();
      destroySpy.mockRestore();
    });

    it("uncaught error가 ErrorHandler로 전달된다", () => {
      const errorHandler = TestBed.inject(ErrorHandler);
      const handleErrorSpy = vi.spyOn(errorHandler, "handleError").mockImplementation(() => {});
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});

      const event = new ErrorEvent("error", {
        message: "test error",
        error: new Error("test"),
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(handleErrorSpy).toHaveBeenCalledWith(event);
      expect(event.defaultPrevented).toBe(true);

      handleErrorSpy.mockRestore();
      destroySpy.mockRestore();
    });

    it("앱 파괴 시 에러 리스너가 정리된다", () => {
      const errorHandler = TestBed.inject(ErrorHandler);
      const handleErrorSpy = vi.spyOn(errorHandler, "handleError").mockImplementation(() => {});
      const destroySpy = vi
        .spyOn(TestBed.inject(ApplicationRef), "destroy")
        .mockImplementation(() => {});

      // TestBed.resetTestingModule()로 환경 파괴 → DestroyRef.onDestroy 실행
      TestBed.resetTestingModule();

      // 파괴 후 이벤트가 핸들러에 도달하지 않는지 확인
      // unhandled rejection을 방지하기 위해 임시 리스너로 캡처
      const tempHandler = (e: Event) => e.preventDefault();
      window.addEventListener("unhandledrejection", tempHandler);

      const event = new PromiseRejectionEvent("unhandledrejection", {
        reason: new Error("after destroy"),
        promise: Promise.resolve(),
        cancelable: true,
      });
      window.dispatchEvent(event);

      expect(handleErrorSpy).not.toHaveBeenCalled();

      window.removeEventListener("unhandledrejection", tempHandler);
      handleErrorSpy.mockRestore();
      destroySpy.mockRestore();
    });
  });

  // ── Rule 5: Service Worker 업데이트 ──

  describe("Rule: provideSdAngular가 Service Worker 업데이트를 주기적으로 확인한다", () => {
    it("SwUpdate 미제공 시 아무 동작 안 함", () => {
      // SwUpdate를 제공하지 않으면 에러 없이 초기화된다
      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });
      expect(() => TestBed.inject(ApplicationRef)).not.toThrow();
    });

    it("업데이트 있음 + 사용자 확인 시 activateUpdate가 호출된다", async () => {
      const checkForUpdateSpy = vi.fn().mockResolvedValue(true);
      // activateUpdate가 resolve하지 않으면 reload에 도달하지 않음
      const activateUpdateSpy = vi.fn().mockReturnValue(new Promise(() => {}));
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      TestBed.configureTestingModule({
        providers: [
          provideSdAngular({ clientName: "test-app" }),
          {
            provide: SwUpdate,
            useValue: {
              isEnabled: true,
              checkForUpdate: checkForUpdateSpy,
              activateUpdate: activateUpdateSpy,
            },
          },
        ],
      });
      TestBed.inject(ApplicationRef);

      await vi.waitFor(() => {
        expect(activateUpdateSpy).toHaveBeenCalled();
      });
      expect(confirmSpy).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it("사용자가 업데이트를 거부하면 activateUpdate가 호출되지 않는다", async () => {
      const checkForUpdateSpy = vi.fn().mockResolvedValue(true);
      const activateUpdateSpy = vi.fn().mockResolvedValue(true);
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      TestBed.configureTestingModule({
        providers: [
          provideSdAngular({ clientName: "test-app" }),
          {
            provide: SwUpdate,
            useValue: {
              isEnabled: true,
              checkForUpdate: checkForUpdateSpy,
              activateUpdate: activateUpdateSpy,
            },
          },
        ],
      });
      TestBed.inject(ApplicationRef);

      await vi.waitFor(() => {
        expect(checkForUpdateSpy).toHaveBeenCalled();
      });
      // confirm 호출 대기
      await vi.waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
      });

      expect(activateUpdateSpy).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });
});

describe("FIX-1 Slice 3: provideSdAngular 수정", () => {
  afterEach(() => {
    localStorage.clear();
    document.body.className = "";
    document.documentElement.style.fontSize = "";
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  describe("Rule: SW 업데이트 폴링은 앱 생명주기를 따라야 한다", () => {
    it("앱이 destroy되면 setTimeout이 clearTimeout으로 정리된다", async () => {
      const checkForUpdateSpy = vi.fn().mockResolvedValue(false);
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      TestBed.configureTestingModule({
        providers: [
          provideSdAngular({ clientName: "test-app" }),
          { provide: SwUpdate, useValue: { isEnabled: true, checkForUpdate: checkForUpdateSpy } },
        ],
      });
      TestBed.inject(ApplicationRef);

      // 폴링이 시작되어 checkForUpdate가 호출될 때까지 대기
      await vi.waitFor(() => {
        expect(checkForUpdateSpy).toHaveBeenCalled();
      });

      // 앱 파괴
      clearTimeoutSpy.mockClear();
      TestBed.resetTestingModule();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("checkForUpdate가 실패해도 다음 폴링이 스케줄된다", async () => {
      const checkForUpdateSpy = vi.fn().mockRejectedValue(new Error("network error"));
      const setTimeoutSpy = vi.spyOn(window, "setTimeout");

      TestBed.configureTestingModule({
        providers: [
          provideSdAngular({ clientName: "test-app" }),
          { provide: SwUpdate, useValue: { isEnabled: true, checkForUpdate: checkForUpdateSpy } },
        ],
      });
      TestBed.inject(ApplicationRef);

      // 첫 번째 호출 (reject) 후 setTimeout이 호출되는지 확인
      await vi.waitFor(() => {
        expect(checkForUpdateSpy).toHaveBeenCalled();
      });

      // reject 후에도 setTimeout(fn, 5*60*1000)이 호출되어야 한다
      await new Promise((r) => setTimeout(r, 10));
      const timeoutCalls = setTimeoutSpy.mock.calls.filter((call) => call[1] === 5 * 60 * 1000);
      expect(timeoutCalls.length).toBeGreaterThan(0);

      setTimeoutSpy.mockRestore();
    });
  });
});

describe("Feature 4.3: 테마 write 방지", () => {
  afterEach(() => {
    localStorage.clear();
    document.body.className = "";
    document.documentElement.style.fontSize = "";
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  describe("Rule: 테마 effect는 값 변경 시에만 localStorage에 write한다", () => {
    it("초기 실행 시 동일 값이면 localStorage에 다시 쓰지 않는다", () => {
      window.localStorage.setItem("test-app.sd-theme", JSON.stringify("ide-dark"));

      TestBed.configureTestingModule({
        providers: [provideSdAngular({ clientName: "test-app" })],
      });

      const sdLocalStorage = TestBed.inject(SdLocalStorageProvider);
      const setSpy = vi.spyOn(sdLocalStorage, "set");

      TestBed.inject(ApplicationRef);
      TestBed.flushEffects();

      const themeSetCalls = setSpy.mock.calls.filter((call) => call[0] === "sd-theme");
      expect(themeSetCalls).toHaveLength(0);

      setSpy.mockRestore();
    });
  });
});

describe("Feature 2.3 Slice 2: 네비게이션 busy 카운터 수정", () => {
  let routerEvents$: Subject<any>;
  let sdBusy: SdBusyProvider;

  beforeEach(() => {
    routerEvents$ = new Subject();
    TestBed.configureTestingModule({
      providers: [
        provideSdAngular({ clientName: "test-app" }),
        { provide: Router, useValue: { events: routerEvents$.asObservable() } },
      ],
    });
    TestBed.inject(ApplicationRef);
    sdBusy = TestBed.inject(SdBusyProvider);
  });

  afterEach(() => {
    localStorage.clear();
    document.body.className = "";
    document.documentElement.style.fontSize = "";
    document.querySelectorAll("div[style*='position: fixed']").forEach((el) => el.remove());
  });

  describe("Rule: 네비게이션 busy 카운터는 음수가 되지 않는다", () => {
    it("첫 이벤트가 NavigationEnd인 경우 globalBusyCount가 0을 유지한다", () => {
      routerEvents$.next(new NavigationEnd(1, "/", "/"));
      TestBed.flushEffects();

      expect(sdBusy.globalBusyCount()).toBe(0);
    });

    it("정상 네비게이션 흐름: NavigationStart → NavigationEnd", () => {
      routerEvents$.next(new NavigationStart(1, "/"));
      TestBed.flushEffects();
      expect(sdBusy.globalBusyCount()).toBe(1);

      routerEvents$.next(new NavigationEnd(1, "/", "/"));
      TestBed.flushEffects();
      expect(sdBusy.globalBusyCount()).toBe(0);
    });

    it("NavigationEnd 연속 2회 발생해도 globalBusyCount가 0을 유지한다", () => {
      routerEvents$.next(new NavigationEnd(1, "/", "/"));
      TestBed.flushEffects();
      routerEvents$.next(new NavigationEnd(2, "/a", "/a"));
      TestBed.flushEffects();

      expect(sdBusy.globalBusyCount()).toBe(0);
    });
  });
});
