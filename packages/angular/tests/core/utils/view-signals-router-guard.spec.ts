import { ElementRef, type Signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, UrlSegment } from "@angular/router";
import { BehaviorSubject, Subject } from "rxjs";
import { describe, it, expect, vi } from "vitest";
import { SdAppStructureProvider } from "../../../src/core/providers/sd-app-structure.provider";
import { useViewTitleSignal } from "../../../src/core/utils/useViewTitleSignal";
import { useViewTypeSignal, type TSdViewType } from "../../../src/core/utils/useViewTypeSignal";
import { setupCanDeactivate } from "../../../src/core/utils/setups/setupCanDeactivate";

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
      const mockAppStructure = {
        getTitleByFullCode: vi.fn().mockReturnValue("[메인] 서브"),
        items: [],
        usableModules: () => undefined,
        permRecord: () => undefined,
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: SdAppStructureProvider, useValue: mockAppStructure },
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

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useViewTitleSignal();
      });

      expect(signal!()).toBe("[메인] 서브");
      expect(mockAppStructure.getTitleByFullCode).toHaveBeenCalledWith("main.sub");
    });

    it("currPageCode 우선, fullPageCode 폴백한다", () => {
      const mockAppStructure = {
        getTitleByFullCode: vi.fn().mockReturnValue("페이지1 제목"),
        items: [],
        usableModules: () => undefined,
        permRecord: () => undefined,
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: SdAppStructureProvider, useValue: mockAppStructure },
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/page1" },
          },
          // ActivatedRoute 미제공 → useCurrentPageCodeSignal returns undefined
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useViewTitleSignal();
      });

      expect(signal!()).toBe("페이지1 제목");
      expect(mockAppStructure.getTitleByFullCode).toHaveBeenCalledWith("page1");
    });
  });

  describe("Rule: 뷰 타입 시그널을 이관한다", () => {
    class MockComponent {}

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
              component: MockComponent,
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute(""), mockUrlRoute("main")],
            },
          },
        ],
      });

      const comp = new MockComponent();
      let signal: Signal<TSdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useViewTypeSignal(() => comp);
      });

      expect(signal!()).toBe("page");
    });

    it("control 타입을 반환한다 (컴포넌트 불일치)", () => {
      class OtherComponent {}

      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              component: OtherComponent,
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute(""), mockUrlRoute("main")],
            },
          },
        ],
      });

      const comp = new MockComponent();
      let signal: Signal<TSdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useViewTypeSignal(() => comp);
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
              component: MockComponent,
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute(""), mockUrlRoute("main")],
            },
          },
        ],
      });

      const comp = new MockComponent();
      let signal: Signal<TSdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useViewTypeSignal(() => comp);
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
        ],
      });

      const comp = new MockComponent();
      let signal: Signal<TSdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useViewTypeSignal(() => comp);
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
