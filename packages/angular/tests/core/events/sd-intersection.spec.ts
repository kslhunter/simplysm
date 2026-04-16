import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdIntersectionTestTemplate } from "./sd-intersection-test.fixture";
import {
  capturedCallback, mockObserve,
  stubIntersectionObserver, makeEntry,
} from "./sd-intersection-test.helpers";

describe("Feature 1.2 SdIntersectionDirective — Unit", () => {
  beforeEach(() => {
    stubIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("directive 생성 시 호스트 엘리먼트를 IntersectionObserver로 observe한다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdIntersectionTestTemplate],
    }).createComponent(SdIntersectionTestTemplate);
    fixture.detectChanges();

    expect(mockObserve).toHaveBeenCalledTimes(1);
    const observedEl = mockObserve.mock.calls[0][0];
    expect(observedEl).toBe(fixture.nativeElement.querySelector(".target"));
  });

  it("entries가 빈 배열이면 emit하지 않는다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdIntersectionTestTemplate],
    }).createComponent(SdIntersectionTestTemplate);
    fixture.detectChanges();

    capturedCallback!([]);

    expect(fixture.componentInstance.events.length).toBe(0);
  });

  it("emit된 이벤트의 entry 객체가 IntersectionObserverEntry와 동일하다", () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SdIntersectionTestTemplate],
    }).createComponent(SdIntersectionTestTemplate);
    fixture.detectChanges();

    const targetEl = fixture.nativeElement.querySelector(".target")!;
    const entry = makeEntry(true, targetEl);
    capturedCallback!([entry]);

    expect(fixture.componentInstance.events[0].entry).toBe(entry);
  });

});
