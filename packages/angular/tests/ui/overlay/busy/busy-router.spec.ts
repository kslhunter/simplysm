import { describe, it, expect, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { Subject } from "rxjs";
import { SdBusyProvider } from "../../../../src/core/providers/sd-busy.provider";
import { SdBusyProviderTestHost } from "./sd-busy-test.fixture";
import { provideSdAngular } from "../../../../src/core/provideSdAngular";

afterEach(() => {
  for (const el of document.body.querySelectorAll("sd-busy-container")) {
    el.remove();
  }
});

function setupWithMockRouter() {
  const events$ = new Subject<any>();
  const mockRouter = { events: events$.asObservable() };

  TestBed.configureTestingModule({
    imports: [SdBusyProviderTestHost],
    providers: [
      provideSdAngular({ clientName: "test" }),
      { provide: Router, useValue: mockRouter },
    ],
  });
  const fixture = TestBed.createComponent(SdBusyProviderTestHost);
  fixture.detectChanges();
  TestBed.flushEffects();

  return { fixture, events$, sdBusy: TestBed.inject(SdBusyProvider) };
}

function flushSync(fixture: any): void {
  fixture.detectChanges();
  TestBed.flushEffects();
}

describe("Feature 3.4 Slice 2: 라우터 네비게이션 busy", () => {
  // Acceptance: NavigationStart 시 busy 활성화
  it("NavigationStart 발생 시 globalBusyCount가 1로 증가한다", () => {
    const { fixture, events$, sdBusy } = setupWithMockRouter();

    expect(sdBusy.globalBusyCount()).toBe(0);

    events$.next(new NavigationStart(1, "/test"));
    flushSync(fixture);

    expect(sdBusy.globalBusyCount()).toBe(1);
  });

  // Acceptance: NavigationEnd 시 busy 비활성화
  it("NavigationEnd 발생 시 globalBusyCount가 0으로 감소한다", () => {
    const { fixture, events$, sdBusy } = setupWithMockRouter();

    events$.next(new NavigationStart(1, "/test"));
    flushSync(fixture);
    expect(sdBusy.globalBusyCount()).toBe(1);

    events$.next(new NavigationEnd(1, "/test", "/test"));
    flushSync(fixture);
    expect(sdBusy.globalBusyCount()).toBe(0);
  });

  // Acceptance: NavigationCancel 시 busy 비활성화
  it("NavigationCancel 발생 시 globalBusyCount가 0으로 감소한다", () => {
    const { fixture, events$, sdBusy } = setupWithMockRouter();

    events$.next(new NavigationStart(1, "/test"));
    flushSync(fixture);
    expect(sdBusy.globalBusyCount()).toBe(1);

    events$.next(new NavigationCancel(1, "/test", "cancelled"));
    flushSync(fixture);
    expect(sdBusy.globalBusyCount()).toBe(0);
  });

  // Acceptance: NavigationError 시 busy 비활성화
  it("NavigationError 발생 시 globalBusyCount가 0으로 감소한다", () => {
    const { fixture, events$, sdBusy } = setupWithMockRouter();

    events$.next(new NavigationStart(1, "/test"));
    flushSync(fixture);
    expect(sdBusy.globalBusyCount()).toBe(1);

    events$.next(new NavigationError(1, "/test", new Error("route error")));
    flushSync(fixture);
    expect(sdBusy.globalBusyCount()).toBe(0);
  });

  // Unit: Router가 없을 때(optional inject) 에러가 발생하지 않는다
  it("Router가 제공되지 않아도 에러 없이 초기화된다", () => {
    TestBed.configureTestingModule({
      imports: [SdBusyProviderTestHost],
      providers: [provideSdAngular({ clientName: "test" })],
    });

    expect(() => {
      const fixture = TestBed.createComponent(SdBusyProviderTestHost);
      fixture.detectChanges();
      TestBed.flushEffects();
    }).not.toThrow();
  });
});
