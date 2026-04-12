import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ElementRef, signal } from "@angular/core";
import { SdAngularConfigProvider } from "../../../src/core/config/sd-angular-config.provider";
import { SdSystemConfigProvider } from "../../../src/core/config/sd-system-config.provider";
import { injectSdSystemConfigResource } from "../../../src/core/config/injectSdSystemConfigResource";

describe("Feature 1.9 Slice 2: 시스템 설정 + 설정 리소스", () => {
  describe("Rule: 시스템 설정은 로컬 또는 커스텀 저장소로 관리한다", () => {
    let configProvider: SdSystemConfigProvider<{ gridColumns: string[] }>;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      const appConfig = TestBed.inject(SdAngularConfigProvider);
      appConfig.clientName = "test-app";

      configProvider = TestBed.inject(SdSystemConfigProvider);
      configProvider.fn = undefined;
      localStorage.clear();
    });

    it("fn 미설정 시 SdLocalStorageProvider를 통해 로컬에 저장/조회된다", async () => {
      await configProvider.setAsync("gridColumns", ["a", "b"]);

      const result = await configProvider.getAsync("gridColumns");
      expect(result).toEqual(["a", "b"]);

      const stored = localStorage.getItem("test-app.gridColumns");
      expect(stored).not.toBeNull();
    });

    it("fn 설정 시 커스텀 fn.set()/fn.get()이 호출된다", async () => {
      const store = new Map<string, unknown>();
      configProvider.fn = {
        set(key, data) {
          store.set(key, data);
        },
        get(key) {
          return Promise.resolve(store.get(key));
        },
      };

      await configProvider.setAsync("gridColumns", ["x", "y"]);

      const result = await configProvider.getAsync("gridColumns");
      expect(result).toEqual(["x", "y"]);

      expect(localStorage.getItem("test-app.gridColumns")).toBeNull();
    });
  });

  describe("Rule: 엘리먼트별 시스템 설정을 resource로 관리한다", () => {
    const mockElementRef = { nativeElement: { tagName: "SD-SHEET" } };

    beforeEach(() => {
      localStorage.clear();
    });

    it("key signal에 값이 있으면 태그명.key로 설정을 비동기 로드한다", async () => {
      localStorage.setItem("test-app.sd-sheet.columns", JSON.stringify(["id", "name"]));

      TestBed.configureTestingModule({
        providers: [{ provide: ElementRef, useValue: mockElementRef }],
      });
      const appConfig = TestBed.inject(SdAngularConfigProvider);
      appConfig.clientName = "test-app";

      const key = signal<string | undefined>("columns");

      let res: ReturnType<typeof injectSdSystemConfigResource<string[]>>;
      TestBed.runInInjectionContext(() => {
        res = injectSdSystemConfigResource<string[]>({ key });
      });

      await vi.waitFor(() => {
        expect(res!.value()).toEqual(["id", "name"]);
      });
    });

    it("set() 호출 시 로컬 값 갱신 + 비동기 저장이 수행된다", async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: ElementRef, useValue: mockElementRef }],
      });
      const appConfig = TestBed.inject(SdAngularConfigProvider);
      appConfig.clientName = "test-app";

      const key = signal<string | undefined>("columns");

      let res: ReturnType<typeof injectSdSystemConfigResource<string[]>>;
      TestBed.runInInjectionContext(() => {
        res = injectSdSystemConfigResource<string[]>({ key });
      });

      // 초기 로드 대기 (값이 없으면 undefined)
      await vi.waitFor(() => {
        expect(res!.value()).toBeUndefined();
      });

      res!.set(["a", "b", "c"]);

      // 로컬 값 즉시 반영
      expect(res!.value()).toEqual(["a", "b", "c"]);

      // queueMicrotask로 비동기 저장 대기
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stored = localStorage.getItem("test-app.sd-sheet.columns");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(["a", "b", "c"]);
    });

    it("key가 undefined이면 로드하지 않고 undefined를 반환한다", async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: ElementRef, useValue: mockElementRef }],
      });
      const appConfig = TestBed.inject(SdAngularConfigProvider);
      appConfig.clientName = "test-app";

      const key = signal<string | undefined>(undefined);

      let res: ReturnType<typeof injectSdSystemConfigResource<string[]>>;
      TestBed.runInInjectionContext(() => {
        res = injectSdSystemConfigResource<string[]>({ key });
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(res!.value()).toBeUndefined();
    });
  });
});

describe("Feature 4.2a Slice 2: 시스템 설정 리소스 안전성", () => {
  const mockElementRef = { nativeElement: { tagName: "SD-SHEET" } };

  beforeEach(() => {
    localStorage.clear();
  });

  // Scenario: undefined 키일 때 서버 요청을 하지 않는다
  it("key()가 undefined이면 getAsync가 호출되지 않는다", async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: mockElementRef }],
    });
    const appConfig = TestBed.inject(SdAngularConfigProvider);
    appConfig.clientName = "test-app";

    const configProvider = TestBed.inject(SdSystemConfigProvider);
    const getAsyncSpy = vi.spyOn(configProvider, "getAsync");

    const key = signal<string | undefined>(undefined);

    let res: ReturnType<typeof injectSdSystemConfigResource<string[]>>;
    TestBed.runInInjectionContext(() => {
      res = injectSdSystemConfigResource<string[]>({ key });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(res!.value()).toBeUndefined();
    expect(getAsyncSpy).not.toHaveBeenCalled();
  });

  // Scenario: destructuring으로 update를 사용한다
  it("destructuring한 update를 호출해도 set이 정상 동작한다", async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: mockElementRef }],
    });
    const appConfig = TestBed.inject(SdAngularConfigProvider);
    appConfig.clientName = "test-app";

    const key = signal<string | undefined>("columns");

    let res: ReturnType<typeof injectSdSystemConfigResource<string[]>>;
    TestBed.runInInjectionContext(() => {
      res = injectSdSystemConfigResource<string[]>({ key });
    });

    // 초기 로드 대기
    await vi.waitFor(() => {
      expect(res!.value()).toBeUndefined();
    });

    // destructuring
    const { update } = res!;

    // update 호출 — this 바인딩 없이도 동작해야 함
    update(() => ["a", "b"]);

    expect(res!.value()).toEqual(["a", "b"]);
  });
});
