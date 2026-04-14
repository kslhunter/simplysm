import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSheetColumnCellTemplate } from "../../../src/data/sheet/sd-sheet-column-cell-template";
import {
  SdSheetCellTplRenderTest,
  SdSheetCellTplContextTest,
  SdSheetCellTplMultiColTest,
} from "./sd-sheet-test.fixture";

// --- Slice 1 Tests ---

describe("Feature 3.1 Slice 1: SdSheetColumnCellTemplate 디렉티브", () => {
  describe("Rule: SdSheetColumnCellTemplate은 ng-template[cell] selector로 매칭된다", () => {
    it("ngTemplateContextGuard는 항상 true를 반환한다", () => {
      // static 메서드는 인스턴스 상태에 의존하지 않으므로 mock 객체로 호출 가능
      const result = SdSheetColumnCellTemplate.ngTemplateContextGuard(
        {} as SdSheetColumnCellTemplate<unknown>,
        {},
      );
      expect(result).toBe(true);
    });

    it("ngTemplateContextGuard는 null 컨텍스트에서도 true를 반환한다", () => {
      const result = SdSheetColumnCellTemplate.ngTemplateContextGuard(
        {} as SdSheetColumnCellTemplate<unknown>,
        null,
      );
      expect(result).toBe(true);
    });
  });
});

// --- Slice 2 Tests ---

describe("Feature 3.1 Slice 2: cellTplRef required 전환", () => {
  describe("Rule: cellTplRef는 required이며 모든 sd-sheet-column에 cell 템플릿이 필수이다", () => {
    it("Scenario: cell 템플릿이 있는 sd-sheet-column이 정상 렌더링된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetCellTplRenderTest],
      }).createComponent(SdSheetCellTplRenderTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const td = host.querySelector("tbody td:not(._feature-cell)") as HTMLElement;
      expect(td).toBeTruthy();
      expect(td.textContent.trim()).toBe("Alice");
    });
  });

  describe("Rule: SdSheetCellContext<T>의 $implicit과 item은 T 타입이다", () => {
    it("Scenario: 템플릿 컨텍스트에 올바른 프로퍼티가 전달된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetCellTplContextTest],
      }).createComponent(SdSheetCellTplContextTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const td = host.querySelector("tbody td:not(._feature-cell)") as HTMLElement;
      expect(td.querySelector(".ctx-item")!.textContent).toBe("Alice");
      expect(td.querySelector(".ctx-index")!.textContent).toBe("0");
      expect(td.querySelector(".ctx-depth")!.textContent).toBe("0");
      expect(td.querySelector(".ctx-edit")!.textContent).toBe("false");
    });
  });

  describe("Rule: 기존 렌더링 기능은 보존된다", () => {
    it("Scenario: 여러 컬럼의 셀 템플릿이 각각 렌더링된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetCellTplMultiColTest],
      }).createComponent(SdSheetCellTplMultiColTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const tds = host.querySelectorAll("tbody td:not(._feature-cell)");
      expect(tds.length).toBe(2);
      expect(tds[0].textContent.trim()).toBe("name:Alice");
      expect(tds[1].textContent.trim()).toBe("age:30");
    });
  });
});
