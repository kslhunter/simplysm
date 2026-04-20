import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetCumulativeSelectionTest,
  SdSheetNonCumulativeTest,
} from "./sd-sheet-test.fixture";

describe("Feature 5.1 Slice 2: <sd-sheet> cumulativeSelection", () => {
  describe("Rule: cumulativeSelection=false(기본)이면 items 변경 시 selectedItems가 초기화된다", () => {
    it("Scenario: 기본 모드에서 items를 새 배열로 교체하면 선택이 초기화된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetNonCumulativeTest],
      }).createComponent(SdSheetNonCumulativeTest);
      fixture.detectChanges();
      await fixture.whenStable();

      // item 2개 선택
      fixture.componentInstance.selectedItems.set([
        fixture.componentInstance.items()[0],
        fixture.componentInstance.items()[1],
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.selectedItems().length).toBe(2);

      // items 교체
      fixture.componentInstance.items.set([
        { id: 3, name: "C" },
        { id: 4, name: "D" },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedItems()).toEqual([]);
    });
  });

  describe("Rule: cumulativeSelection=true이면 items 변경 시 selectedItems가 유지된다", () => {
    it("Scenario: 누적 모드에서 items를 교체해도 기존 선택이 유지된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetCumulativeSelectionTest],
      }).createComponent(SdSheetCumulativeSelectionTest);
      fixture.detectChanges();
      await fixture.whenStable();

      // 1페이지에서 2개 선택
      fixture.componentInstance.selectedItems.set([
        fixture.componentInstance.items()[0],
        fixture.componentInstance.items()[1],
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.selectedItems().length).toBe(2);

      // 2페이지 items로 교체
      fixture.componentInstance.items.set([
        { id: 3, name: "C" },
        { id: 4, name: "D" },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      // 선택 유지
      expect(fixture.componentInstance.selectedItems().length).toBe(2);
    });

    it("Scenario: 누적 모드에서 외부에서 selectedItems.set([]) 호출하면 초기화된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetCumulativeSelectionTest],
      }).createComponent(SdSheetCumulativeSelectionTest);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.selectedItems.set([
        fixture.componentInstance.items()[0],
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.selectedItems.set([]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedItems()).toEqual([]);
    });
  });

  describe("Rule: 체크 표시는 key 비교로 복원된다 (UI 회귀)", () => {
    it("Scenario: 누적 모드에서 같은 key의 다른 reference item도 체크박스가 체크된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetCumulativeSelectionTest],
      }).createComponent(SdSheetCumulativeSelectionTest);
      fixture.detectChanges();
      await fixture.whenStable();

      // id=1 item을 선택
      fixture.componentInstance.selectedItems.set([
        fixture.componentInstance.items()[0],
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      // items를 새 reference로 교체 (id는 동일)
      fixture.componentInstance.items.set([
        { id: 1, name: "A-updated" },
        { id: 2, name: "B-updated" },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const checkboxes = host.querySelectorAll<HTMLElement>(
        "tbody tr td._feature-cell sd-checkbox",
      );
      // 첫 번째 행(id=1)은 key 매칭으로 체크 표시
      expect(checkboxes[0].getAttribute("data-sd-checked")).toBe("true");
      // 두 번째 행(id=2)은 비체크
      expect(checkboxes[1].getAttribute("data-sd-checked")).toBe("false");
    });
  });

  describe("Rule: 초기 마운트 시 소비자 제공 초기 selectedItems가 보존된다", () => {
    it("Scenario: 컴포넌트 생성 직후 초기 selectedItems는 리셋되지 않는다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetNonCumulativeTest],
      }).createComponent(SdSheetNonCumulativeTest);
      // detectChanges 전에 초기 선택 주입
      fixture.componentInstance.selectedItems.set([
        fixture.componentInstance.items()[0],
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedItems().length).toBe(1);
    });
  });
});
