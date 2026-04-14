import { describe, it, expect } from "vitest";
import { TestBed } from "@angular/core/testing";
import {
  SdSheetHeaderStyleTest,
  SdSheetHeaderStyleWithWidthTest,
  SdSheetTooltipTest,
  SdSheetBasicTest,
  SdSheetHeaderTplTest,
} from "./sd-sheet-test.fixture";

describe("Feature 1.1 Slice 1: headerStyle + tooltip 복원", () => {
  describe("Rule: headerStyle은 컬럼 헤더 셀에 CSS 인라인 스타일을 적용한다", () => {
    it("Scenario: headerStyle이 설정된 컬럼의 헤더 셀에 인라인 스타일이 적용된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetHeaderStyleTest],
      }).createComponent(SdSheetHeaderStyleTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      // headerStyle is now on the inner div inside ._headerContent
      const innerDiv = th.querySelector("._headerContent > .flex-fill") as HTMLElement;
      expect(innerDiv.getAttribute("style")).toContain("color: red");
      expect(innerDiv.getAttribute("style")).toContain("font-weight: bold");
    });

    it("Scenario: headerStyle이 기존 스타일(width)과 합쳐진다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetHeaderStyleWithWidthTest],
      }).createComponent(SdSheetHeaderStyleWithWidthTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      // headerStyle is on the inner div, width is on th
      const innerDiv = th.querySelector("._headerContent > .flex-fill") as HTMLElement;
      expect(innerDiv.getAttribute("style")).toContain("color: red");
      expect(th.style.width).toBe("200px");
    });

    it("Scenario: headerStyle 미설정 시 기존 스타일만 적용된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      expect(th.style.width).toBe("200px");
      // headerStyle이 없으므로 inner div에 style 속성 없음
      const innerDiv = th.querySelector("._headerContent > .flex-fill") as HTMLElement;
      expect(innerDiv.getAttribute("style")).toBeNull();
    });
  });

  describe("Rule: tooltip은 헤더 셀에 네이티브 title 툴팁과 dotted underline을 제공한다", () => {
    it("Scenario: tooltip이 설정된 컬럼의 헤더 셀에 title 속성이 표시된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetTooltipTest],
      }).createComponent(SdSheetTooltipTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      expect(th.getAttribute("title")).toBe("이 컬럼은 수량입니다");
    });

    it("Scenario: tooltip이 설정된 컬럼의 헤더 셀에 .help 클래스가 적용된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetTooltipTest],
      }).createComponent(SdSheetTooltipTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      expect(th.classList.contains("help")).toBe(true);
    });

    it("Scenario: tooltip 미설정 시 cell.text가 title로 표시된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      expect(th.getAttribute("title")).toBe("이름");
    });

    it("Scenario: tooltip 미설정 시 .help 클래스가 적용되지 않는다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      expect(th.classList.contains("help")).toBe(false);
    });
  });
});

describe("Feature 1.1 Slice 2: headerTplRef 복원", () => {
  describe("Rule: headerTplRef는 커스텀 헤더 템플릿으로 기본 텍스트를 대체한다", () => {
    it("Scenario: headerTplRef가 설정된 컬럼의 leaf 헤더 셀에 커스텀 템플릿이 렌더링된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetHeaderTplTest],
      }).createComponent(SdSheetHeaderTplTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      const customHeader = th.querySelector("em.custom-header");
      expect(customHeader).toBeTruthy();
      expect(customHeader!.textContent).toBe("커스텀 헤더");
      // 기본 텍스트 pre는 없어야 한다 (커스텀 템플릿이 대체)
      const defaultPre = th.querySelector("._p-sheet pre");
      expect(defaultPre).toBeFalsy();
    });

    it("Scenario: headerTplRef 미설정 시 기본 텍스트가 렌더링된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [SdSheetBasicTest],
      }).createComponent(SdSheetBasicTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;
      const th = host.querySelector("thead th._last-depth:not(._feature-cell)") as HTMLElement;
      expect(th.textContent.trim()).toContain("이름");
    });
  });
});
