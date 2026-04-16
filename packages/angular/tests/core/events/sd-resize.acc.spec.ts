import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdResizeTestTemplate } from "./sd-resize-test.fixture";
import {
  capturedCallback, mockDisconnect,
  stubResizeObserver, makeEntry, waitForRaf,
} from "./sd-resize-test.helpers";

describe("Feature 1.1 SdResizeDirective — Acceptance", () => {
  beforeEach(() => {
    stubResizeObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("엘리먼트 너비만 변경 시 widthChanged=true, heightChanged=false로 emit된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(200, 0, targetEl)]);
    await waitForRaf();

    expect(fixture.componentInstance.events.length).toBe(1);
    expect(fixture.componentInstance.events[0].widthChanged).toBe(true);
    expect(fixture.componentInstance.events[0].heightChanged).toBe(false);
  });

  it("엘리먼트 높이만 변경 시 heightChanged=true, widthChanged=false로 emit된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 100, targetEl)]);
    await waitForRaf();

    fixture.componentInstance.events = [];
    capturedCallback!([makeEntry(100, 200, targetEl)]);
    await waitForRaf();

    expect(fixture.componentInstance.events.length).toBe(1);
    expect(fixture.componentInstance.events[0].heightChanged).toBe(true);
    expect(fixture.componentInstance.events[0].widthChanged).toBe(false);
  });

  it("빠른 연속 resize 시 마지막 값으로 한 번만 emit된다", async () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(100, 0, targetEl)]);
    capturedCallback!([makeEntry(200, 0, targetEl)]);
    capturedCallback!([makeEntry(300, 0, targetEl)]);
    await waitForRaf();

    expect(fixture.componentInstance.events.length).toBe(1);
    expect(fixture.componentInstance.events[0].contentRect.width).toBe(300);
  });

  it("directive destroy 시 ResizeObserver가 disconnect된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdResizeTestTemplate],
    }).createComponent(SdResizeTestTemplate);
    fixture.detectChanges();

    fixture.destroy();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
