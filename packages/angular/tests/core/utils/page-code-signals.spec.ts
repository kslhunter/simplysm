import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, NavigationEnd, Router, UrlSegment } from "@angular/router";
import { BehaviorSubject, Subject } from "rxjs";
import type { Signal } from "@angular/core";
import { useCurrentPageCodeSignal } from "../../../src/core/utils/useCurrentPageCodeSignal";
import { useFullPageCodeSignal } from "../../../src/core/utils/useFullPageCodeSignal";

function mockUrlRoute(path: string) {
  const segments = path !== "" ? [new UrlSegment(path, {})] : [];
  return {
    url: new BehaviorSubject(segments),
    snapshot: { url: segments },
  };
}

describe("Feature 1.11 Slice 1: 페이지 코드 시그널", () => {
  describe("Rule: 현재 페이지 코드 시그널을 이관한다", () => {
    it("pathFromRoot[2:]의 URL 세그먼트를 '.'으로 결합한다", () => {
      TestBed.configureTestingModule({
        providers: [
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
        signal = useCurrentPageCodeSignal();
      });

      expect(signal!()).toBe("main.sub");
    });

    it("URL 세그먼트 변경 시 시그널 값이 업데이트된다", () => {
      const seg3 = new BehaviorSubject([new UrlSegment("sub", {})]);
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              pathFromRoot: [
                mockUrlRoute(""),
                mockUrlRoute(""),
                mockUrlRoute("main"),
                { url: seg3, snapshot: { url: [new UrlSegment("sub", {})] } },
              ],
            },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useCurrentPageCodeSignal();
      });

      expect(signal!()).toBe("main.sub");

      seg3.next([new UrlSegment("other", {})]);

      expect(signal!()).toBe("main.other");
    });

    it("ActivatedRoute 없으면 undefined를 반환한다", () => {
      TestBed.configureTestingModule({});

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useCurrentPageCodeSignal();
      });

      expect(signal).toBeUndefined();
    });

    it("pathFromRoot에 세그먼트가 2개 이하면 빈 문자열을 반환한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              pathFromRoot: [mockUrlRoute(""), mockUrlRoute("app")],
            },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useCurrentPageCodeSignal();
      });

      expect(signal!()).toBe("");
    });
  });

  describe("Rule: 전체 페이지 코드 시그널을 이관한다", () => {
    it("현재 URL에서 페이지 코드를 추출한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main/sub" },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useFullPageCodeSignal();
      });

      expect(signal!()).toBe("main.sub");
    });

    it("매트릭스 파라미터를 제거한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/page;id=1/child" },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useFullPageCodeSignal();
      });

      expect(signal!()).toBe("page.child");
    });

    it("NavigationEnd 시 시그널이 업데이트된다", () => {
      const events = new Subject<NavigationEnd>();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events, url: "/app/page1" },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useFullPageCodeSignal();
      });

      expect(signal!()).toBe("page1");

      events.next(new NavigationEnd(1, "/app/page2", "/app/page2"));

      expect(signal!()).toBe("page2");
    });

    it("쿼리 파라미터를 제거한다", () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Router,
            useValue: { events: new Subject(), url: "/app/main/sub?q=1&p=2" },
          },
        ],
      });

      let signal: Signal<string> | undefined;
      TestBed.runInInjectionContext(() => {
        signal = useFullPageCodeSignal();
      });

      expect(signal!()).toBe("main.sub");
    });
  });

});
