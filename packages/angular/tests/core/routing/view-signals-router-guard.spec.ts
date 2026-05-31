import { ElementRef, type Signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, UrlSegment } from "@angular/router";
import { BehaviorSubject, Subject } from "rxjs";
import { describe, it, expect, vi } from "vitest";
import { SdAppStructureProvider } from "../../../src/core/app-structure/sd-app-structure.provider";
import { injectViewTitleSignal } from "../../../src/core/routing/injectViewTitleSignal";
import { injectViewTypeSignal, type SdViewType } from "../../../src/core/routing/injectViewTypeSignal";
import { setupCanDeactivate } from "../../../src/core/routing/setupCanDeactivate";

// reflectComponentType가 읽는 ɵcmp 메타데이터를 수동 설정하여 테스트용 컴포넌트 생성
function createTestComponent(selector: string) {
  const comp = class {} as unknown as Record<string, unknown>;
  comp["ɵcmp"] = { selectors: [[selector]] };
  return comp;
}

const TestComp = createTestComponent("test-comp");

function mockUrlRoute(path: string) {
  const segments = path !== "" ? [new UrlSegment(path, {})] : [];
  return {
    url: new BehaviorSubject(segments),
    snapshot: { url: segments },
  };
}

describe("Feature 1.11 Slice 2: 뷰 상태 시그널 + 라우터 가드", () => {
  describe("Rule: 뷰 제목 시그널을 이관한다", () => {
    it("앱 구조에서 제목을 반환한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main/sub" },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              pathFromRoot: [
                mockUrlRoute(""),
                mockUrlRoute(""),
                mockUrlRoute("main"),
                mockUrlRoute("sub"),
              ],
            },
          },
        ],
      });
      const appStructure = TestBed.inject(SdAppStructureProvider);
      const getTitleSpy = vi.spyOn(appStructure, "getTitleByFullCode").mockReturnValue("[메인] 서브");

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTitleSignal();
      });

      expect(signal!()).toBe("[메인] 서브");
      expect(getTitleSpy).toHaveBeenCalledWith("main.sub");
    });

    it("currPageCode 우선, fullPageCode 폴백한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/page1" },
          },
          // ActivatedRoute 미제공 → injectCurrentPageCodeSignal returns undefined
        ],
      });
      const appStructure = TestBed.inject(SdAppStructureProvider);
      const getTitleSpy = vi.spyOn(appStructure, "getTitleByFullCode").mockReturnValue("페이지1 제목");

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTitleSignal();
      });

      expect(signal!()).toBe("페이지1 제목");
      expect(getTitleSpy).toHaveBeenCalledWith("page1");
    });

    it("getTitleByFullCode가 throw하면 빈 문자열을 반환한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/page1" },
          },
        ],
      });
      const appStructure = TestBed.inject(SdAppStructureProvider);
      vi.spyOn(appStructure, "getTitleByFullCode").mockImplementation(() => {
        throw new Error("Item not found for fullCode: page1");
      });

      let titleSignal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        titleSignal = injectViewTitleSignal();
      });

      expect(titleSignal!()).toBe("");
    });
  });

  describe("Rule: 뷰 타입 시그널을 이관한다", () => {
    it("page 타입을 반환한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              component: TestComp,
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute(""), mockUrlRoute("main")],
            },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal();
      });

      expect(signal!()).toBe("page");
    });

    it("control 타입을 반환한다 (컴포넌트 셀렉터 불일치)", () => {
      const OtherComp = createTestComponent("other-comp");

      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              component: OtherComp,
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute(""), mockUrlRoute("main")],
            },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal();
      });

      expect(signal!()).toBe("control");
    });

    it("control 타입을 반환한다 (fullPageCode !== currPageCode)", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main/sub" },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              component: TestComp,
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute(""), mockUrlRoute("main")],
            },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal();
      });

      // fullPageCode = "main.sub", currPageCode = "main" → not equal → control
      expect(signal!()).toBe("control");
    });

    it("ActivatedRoute 없으면 control을 반환한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal();
      });

      expect(signal!()).toBe("control");
    });
  });

  describe("Rule: 라우터 가드 셋업을 이관한다", () => {

    it("라우터 canDeactivate 가드를 등록한다", () => {
      const routeConfig = { canDeactivate: [] as unknown[] };
      const fn = vi.fn().mockReturnValue(true);

      TestBed.configureTestingModule({
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              component: TestComp,
              routeConfig,
            },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      TestBed.runInInjectionContext(() => {
        setupCanDeactivate(fn);
      });

      expect(routeConfig.canDeactivate).toHaveLength(1);
      const guard = routeConfig.canDeactivate[0] as () => boolean;
      expect(guard()).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("routeConfig 없으면 무시한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              component: TestComp,
              routeConfig: null,
            },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      const fn = vi.fn();
      TestBed.runInInjectionContext(() => {
        setupCanDeactivate(fn);
      });

      // 오류 없음, fn 미호출
      expect(fn).not.toHaveBeenCalled();
    });

    it("컴포넌트 셀렉터 불일치 시 무시한다", () => {
      const routeConfig = { canDeactivate: [] as unknown[] };

      TestBed.configureTestingModule({
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              component: TestComp,
              routeConfig,
            },
          },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "OTHER-COMP" } },
          },
        ],
      });

      TestBed.runInInjectionContext(() => {
        setupCanDeactivate(() => false);
      });

      expect(routeConfig.canDeactivate).toHaveLength(0);
    });

    it("ActivatedRoute 없으면 무시한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      const fn = vi.fn();
      TestBed.runInInjectionContext(() => {
        setupCanDeactivate(fn);
      });

      expect(fn).not.toHaveBeenCalled();
    });
  });
});
