import { ElementRef, type Signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, UrlSegment } from "@angular/router";
import { BehaviorSubject, Subject } from "rxjs";
import { describe, it, expect, vi } from "vitest";
import { SdAppStructureProvider } from "../../../src/core/app-structure/sd-app-structure.provider";
import { injectViewTitleSignal } from "../../../src/core/routing/injectViewTitleSignal";
import { injectViewTypeSignal, type SdViewType } from "../../../src/core/routing/injectViewTypeSignal";
import { setupCanDeactivate } from "../../../src/core/routing/setupCanDeactivate";
import { SdActivatedModalProvider } from "../../../src/core/modal/sd-activated-modal.provider";
import "@simplysm/core-browser";

function mockUrlRoute(path: string) {
  const segments = path !== "" ? [new UrlSegment(path, {})] : [];
  return {
    url: new BehaviorSubject(segments),
    snapshot: { url: segments },
  };
}

// reflectComponentType가 읽는 cmp 메타데이터를 수동 설정하여 테스트용 컴포넌트 생성
function createTestComponent(selector: string) {
  const comp = class {} as unknown as Record<string, unknown>;
  comp["\u0275cmp"] = { selectors: [[selector]] };
  return comp;
}

const TestComp = createTestComponent("test-comp");

describe("Feature 3.2.1 Slice 1: 뷰 시그널 + 라우터 가드 모달 통합", () => {
  describe("Rule: injectViewTypeSignal이 모달 컨텍스트에서 'modal'을 반환한다", () => {
    it("Unit: SdActivatedModalProvider + ActivatedRoute 모두 있어도 'modal' 우선", () => {
      class MockComponent {}
      const activatedModal = new SdActivatedModalProvider();

      TestBed.configureTestingModule({
        providers: [
          { provide: SdActivatedModalProvider, useValue: activatedModal },
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
      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal(() => comp);
      });

      // 모달이 우선이므로 page가 아닌 modal이어야 한다
      expect(signal!()).toBe("modal");
    });

    it("Scenario: 모달 내부 컴포넌트에서 호출 -> 'modal' 반환", () => {
      const activatedModal = new SdActivatedModalProvider();

      TestBed.configureTestingModule({
        providers: [
          { provide: SdActivatedModalProvider, useValue: activatedModal },
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
        ],
      });

      class MockComponent {}
      const comp = new MockComponent();
      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal(() => comp);
      });

      expect(signal!()).toBe("modal");
    });

    it("Scenario: 페이지 컴포넌트에서 호출 -> 기존 동작 유지 ('page')", () => {
      class MockComponent {}

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
      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal(() => comp);
      });

      expect(signal!()).toBe("page");
    });

    it("Scenario: 비-라우트 비-모달 컴포넌트에서 호출 -> 'control'", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
        ],
      });

      class MockComponent {}
      const comp = new MockComponent();
      let signal: Signal<SdViewType> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTypeSignal(() => comp);
      });

      expect(signal!()).toBe("control");
    });
  });

  describe("Rule: injectViewTitleSignal이 모달 컨텍스트에서 모달 제목을 반환한다", () => {
    it("Unit: modalComponent가 아직 설정되지 않았으면 빈 문자열 반환", () => {
      const activatedModal = new SdActivatedModalProvider();
      // modalComponent is undefined by default

      const mockAppStructure = {
        getTitleByFullCode: vi.fn().mockReturnValue("페이지 제목"),
        items: [],
        usableModules: () => undefined,
        permRecord: () => undefined,
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: SdActivatedModalProvider, useValue: activatedModal },
          { provide: SdAppStructureProvider, useValue: mockAppStructure },
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTitleSignal();
      });

      expect(signal!()).toBe("");
    });

    it("Scenario: 모달 내부에서 호출 -> 모달 제목 반환", () => {
      const activatedModal = new SdActivatedModalProvider();
      // modalComponent가 title() signal을 가지도록 설정
      const mockModalComponent = {
        title: () => "주문 상세",
      };
      activatedModal.modalComponent.set(mockModalComponent);

      const mockAppStructure = {
        getTitleByFullCode: vi.fn().mockReturnValue("무시될 제목"),
        items: [],
        usableModules: () => undefined,
        permRecord: () => undefined,
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: SdActivatedModalProvider, useValue: activatedModal },
          { provide: SdAppStructureProvider, useValue: mockAppStructure },
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main" },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = injectViewTitleSignal();
      });

      expect(signal!()).toBe("주문 상세");
    });

    it("Scenario: 페이지에서 호출 -> 기존 동작 유지", () => {
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
        signal = injectViewTitleSignal();
      });

      expect(signal!()).toBe("[메인] 서브");
    });
  });

  describe("Rule: setupCanDeactivate가 모달에서 canDeactiveFn을 설정한다", () => {
    it("Scenario: 모달 내부에서 닫기 차단 설정", () => {
      const activatedModal = new SdActivatedModalProvider();
      const fn = () => false;

      TestBed.configureTestingModule({
        providers: [
          { provide: SdActivatedModalProvider, useValue: activatedModal },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      TestBed.runInInjectionContext(() => {
        setupCanDeactivate(fn);
      });

      expect(activatedModal.canDeactiveFn()).toBe(false);
    });

    it("Scenario: 모달 내부에서 닫기 허용 설정", () => {
      const activatedModal = new SdActivatedModalProvider();
      const fn = () => true;

      TestBed.configureTestingModule({
        providers: [
          { provide: SdActivatedModalProvider, useValue: activatedModal },
          {
            provide: ElementRef,
            useValue: { nativeElement: { tagName: "TEST-COMP" } },
          },
        ],
      });

      TestBed.runInInjectionContext(() => {
        setupCanDeactivate(fn);
      });

      expect(activatedModal.canDeactiveFn()).toBe(true);
    });

    it("Scenario: 페이지에서 호출 -> 기존 동작 유지 (라우터 가드)", () => {
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
    });
  });
});
