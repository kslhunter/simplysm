import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetBasicTest,
  SdSheetDefaultTrackByTest,
  SdSheetSelectMultiTest,
  SdSheetSelectDisabledTest,
} from "./sd-sheet-test.fixture";
import { SdSheet } from "../../../src/data/sheet/sd-sheet";

describe("Feature 4.1: sd-sheet 복원", () => {
  // --- Slice 1: trackByFn + sort icon ---

  describe("Slice 1: trackByFn 기본값 + 정렬 아이콘", () => {
    it("Rule: trackByFn 기본값은 (item) => item — 미지정 시 객체 identity 반환", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetDefaultTrackByTest],
      }).createComponent(SdSheetDefaultTrackByTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const sdSheet = fixture.debugElement.children[0].componentInstance as SdSheet<unknown>;
      const fn = sdSheet.trackByFn();
      expect(fn).toBeDefined();

      const item = { name: "test" };
      expect(fn(item, 0)).toBe(item);
    });
  });

  // --- Slice 2: 선택 동작 복원 ---

  describe("Slice 2: 선택 동작 복원", () => {
    it("Rule: 체크박스 테마는 white — 헤더 전체선택 체크박스의 테마가 white이다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetSelectMultiTest],
      }).createComponent(SdSheetSelectMultiTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const headerCheckbox = host.querySelector("thead th._feature-cell sd-checkbox") as HTMLElement;
      expect(headerCheckbox.getAttribute("data-sd-theme")).toBe("white");
    });

    it("Rule: 체크박스 테마는 white — 바디 멀티선택 체크박스의 테마가 white이다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetSelectMultiTest],
      }).createComponent(SdSheetSelectMultiTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const bodyCheckboxes = host.querySelectorAll(
        "tbody td._feature-cell sd-checkbox",
      );
      for (const cb of bodyCheckboxes) {
        expect((cb as HTMLElement).getAttribute("data-sd-theme")).toBe("white");
      }
    });

    it("Rule: 멀티선택 disabled — selectable이 아닌 행의 체크박스가 disabled이다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetSelectDisabledTest],
      }).createComponent(SdSheetSelectDisabledTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const checkboxes = host.querySelectorAll("tbody td._feature-cell sd-checkbox");
      // Row C (index 2) has selectableFn returning "권한 없음" (not true)
      const rowCCheckbox = checkboxes[2] as HTMLElement;
      expect(rowCCheckbox.getAttribute("data-sd-disabled")).toBe("true");
    });
  });

  // --- Slice 3: DOM 속성 + feature cell fixing ---

  describe("Slice 3: DOM 속성 복원", () => {
    it("Rule: 헤더 셀에 data-c 속성 — feature-cell에 data-c가 있다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const featureTh = host.querySelector("thead th._feature-cell") as HTMLElement;
      expect(featureTh.hasAttribute("data-c")).toBe(true);
    });

    it("Rule: 헤더 셀에 data-c 속성 — 마지막행 th에 data-c가 있다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const lastDepthTh = host.querySelector(
        "thead th._last-depth:not(._feature-cell)",
      ) as HTMLElement;
      expect(lastDepthTh.hasAttribute("data-c")).toBe(true);
      expect(lastDepthTh.getAttribute("data-c")).toBe("0");
    });

    it("Rule: 바디 feature-cell에 data-r/data-c 속성이 있다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const featureTd = host.querySelector("tbody td._feature-cell") as HTMLElement;
      expect(featureTd.hasAttribute("data-r")).toBe(true);
      expect(featureTd.hasAttribute("data-c")).toBe(true);
    });
  });
});
