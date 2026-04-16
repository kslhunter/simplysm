import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdResizeTestTemplate, SdResizeTestHostDirective } from "./sd-resize-test.fixture";
import {
  capturedCallback, mockObserve,
  stubResizeObserver, makeEntry, waitForRaf,
} from "./sd-resize-test.helpers";

describe("Feature 1.1 SdResizeDirective — Unit", () => {
  beforeEach(() => {
    stubResizeObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("directive 생성 시 호스트 엘리먼트를 ResizeObserver로 observe한다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    expect(mockObserve).toHaveBeenCalledTimes(1);
    const observedEl = mockObserve.mock.calls[0][0];
    expect(observedEl).toBe(fixture.nativeElement.querySelector(".target"));
  });

  it("prevWidth/prevHeight 초기값은 0이므로 첫 콜백은 변경으로 감지된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 50, targetEl)]);
    await waitForRaf();

    expect(fixture.componentInstance.events[0].widthChanged).toBe(true);
    expect(fixture.componentInstance.events[0].heightChanged).toBe(true);
  });

  it("크기가 동일한 연속 콜백 시 widthChanged/heightChanged 모두 false로 emit된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 50, targetEl)]);
    await waitForRaf();

    fixture.componentInstance.events = [];
    capturedCallback!([makeEntry(100, 50, targetEl)]);
    await waitForRaf();

    expect(fixture.componentInstance.events[0].widthChanged).toBe(false);
    expect(fixture.componentInstance.events[0].heightChanged).toBe(false);
  });

  it("emit되는 이벤트에 target과 contentRect가 포함된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 50, targetEl)]);
    await waitForRaf();

    const event = fixture.componentInstance.events[0];
    expect(event.target).toBe(targetEl);
    expect(event.contentRect.width).toBe(100);
    expect(event.contentRect.height).toBe(50);
  });

  it("연속 콜백 시 이전 requestAnimationFrame이 취소된다", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 0, targetEl)]);
    capturedCallback!([makeEntry(200, 0, targetEl)]);

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("destroy 시 미결 requestAnimationFrame이 취소된다", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 50, targetEl)]);

    fixture.destroy();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it("hostDirectives(outputs 노출)로 적용된 경우 호스트 엘리먼트의 resize를 감지한다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestHostDirective],
    }).createComponent(SdResizeTestHostDirective);
    fixture.detectChanges();

    const hostEl = fixture.nativeElement;
    capturedCallback!([makeEntry(300, 200, hostEl)]);
    await waitForRaf();

    expect(fixture.componentInstance.events.length).toBe(1);
    expect(fixture.componentInstance.events[0].widthChanged).toBe(true);
  });
});
