import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdIntersectionTestTemplate } from "./sd-intersection-test.fixture";
import {
  capturedCallback, mockDisconnect,
  stubIntersectionObserver, makeEntry,
} from "./sd-intersection-test.helpers";

describe("Feature 1.2 SdIntersectionDirective — Acceptance", () => {
  beforeEach(() => {
    stubIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("intersection 변화 시 마지막 entry를 포함한 SdIntersectionEvent가 emit된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdIntersectionTestTemplate],
    }).createComponent(SdIntersectionTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(true, targetEl)]);

    expect(fixture.componentInstance.events.length).toBe(1);
    expect(fixture.componentInstance.events[0].entry.isIntersecting).toBe(true);
    expect(fixture.componentInstance.events[0].entry.target).toBe(targetEl);
  });

  it("여러 entries 전달 시 마지막 entry만 emit된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdIntersectionTestTemplate],
    }).createComponent(SdIntersectionTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    capturedCallback!([makeEntry(false, targetEl), makeEntry(true, targetEl)]);

    expect(fixture.componentInstance.events.length).toBe(1);
    expect(fixture.componentInstance.events[0].entry.isIntersecting).toBe(true);
  });

  it("directive destroy 시 IntersectionObserver가 disconnect된다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdIntersectionTestTemplate],
    }).createComponent(SdIntersectionTestTemplate);
    fixture.detectChanges();

    fixture.destroy();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
