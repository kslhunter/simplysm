import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { SdAppStructureProvider } from "../../../src/core/app-structure/sd-app-structure.provider";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { SdSharedDataProvider } from "../../../src/core/shared-data/sd-shared-data.provider";
import { SdFileDialogProvider } from "../../../src/core/file-dialog/sd-file-dialog.provider";
import {
  DSHeaderStyleTest,
  DSTooltipTest,
  DSHeaderTplTest,
  DSTestHost,
} from "./sd-data-sheet-test.fixture";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      {
        provide: SdAppStructureProvider,
        useValue: {
          items: [],
          usableModules: () => undefined,
          permRecord: () => undefined,
          getTitleByFullCode: vi.fn().mockReturnValue(""),
          getPermsByFullCode: vi.fn().mockReturnValue([]),
        },
      },
      { provide: Router, useValue: { events: new Subject(), url: "/app/test" } },
      {
        provide: SdToastProvider,
        useValue: {
          try: vi.fn(async (fn: () => Promise<any>) => fn()),
          info: vi.fn(),
          success: vi.fn(),
          danger: vi.fn(),
        },
      },
      {
        provide: SdSharedDataProvider,
        useValue: { wait: vi.fn().mockResolvedValue(undefined), loadingCount: () => 0 },
      },
      { provide: SdFileDialogProvider, useValue: { showAsync: vi.fn() } },
    ],
  });
}

async function createAndInit(component: any, items = [{ id: 1, name: "Alice" }]) {
  const fixture = TestBed.createComponent(component);
  const host = fixture.componentInstance as any;
  host.searchFn.mockResolvedValue({ items, pageLength: 0 });

  fixture.detectChanges();
  TestBed.flushEffects();
  await new Promise<void>((r) => setTimeout(r, 0));
  fixture.detectChanges();
  await fixture.whenStable();

  return fixture;
}

function getHeaderTh(fixture: any): HTMLElement {
  const host = fixture.nativeElement as HTMLElement;
  // sd-data-sheet 내부의 sd-sheet > thead > tr > th 중 데이터 컬럼 th를 찾는다
  // _select-col, _expand-col이 아닌 th
  const ths = host.querySelectorAll<HTMLElement>(
    "thead th:not(._select-col):not(._expand-col)",
  );
  // isDeleted 컬럼(fixed) + 사용자 컬럼 중 마지막이 사용자 컬럼
  // 실제로 isDeleted 컬럼이 있으므로, 'name' key를 가진 th를 찾는다
  // isLastRow th에 title이 있는것으로 식별
  for (const th of ths) {
    const title = th.getAttribute("title");
    if (title != null && title !== "") return th;
  }
  // fallback: 마지막 th
  return ths[ths.length - 1];
}

describe("Feature 1.2 Slice 1: headerStyle/tooltip/headerTplRef 전파", () => {
  describe("Rule: sd-data-sheet-column의 headerStyle이 헤더 셀에 적용된다", () => {
    beforeEach(() => setupTestBed(DSHeaderStyleTest));

    it("headerStyle이 설정된 sd-data-sheet-column의 헤더 셀에 인라인 스타일이 적용된다", async () => {
      const fixture = await createAndInit(DSHeaderStyleTest);
      const th = getHeaderTh(fixture);
      expect(th.style.color).toBe("red");
    });
  });

  describe("Rule: sd-data-sheet-column의 headerStyle 미설정 시 기존 스타일만 적용", () => {
    beforeEach(() => setupTestBed(DSTestHost));

    it("headerStyle 미설정 시 기존 스타일만 적용된다", async () => {
      const fixture = await createAndInit(DSTestHost);
      const th = getHeaderTh(fixture);
      expect(th.style.color).toBe("");
    });
  });

  describe("Rule: sd-data-sheet-column의 tooltip이 헤더 셀에 적용된다", () => {
    beforeEach(() => setupTestBed(DSTooltipTest));

    it("tooltip이 설정된 sd-data-sheet-column의 헤더 셀에 title과 .help 클래스가 적용된다", async () => {
      const fixture = await createAndInit(DSTooltipTest);
      const th = getHeaderTh(fixture);
      expect(th.getAttribute("title")).toBe("이 컬럼은 수량입니다");
      expect(th.classList.contains("help")).toBe(true);
    });
  });

  describe("Rule: sd-data-sheet-column의 tooltip 미설정 시 header 텍스트가 title", () => {
    beforeEach(() => setupTestBed(DSTestHost));

    it("tooltip 미설정 시 header 텍스트가 title로 표시된다", async () => {
      const fixture = await createAndInit(DSTestHost);
      const th = getHeaderTh(fixture);
      expect(th.getAttribute("title")).toBe("이름");
    });
  });

  describe("Rule: sd-data-sheet-column의 #headerTpl이 헤더 셀에 렌더링된다", () => {
    beforeEach(() => setupTestBed(DSHeaderTplTest));

    it("#headerTpl이 설정된 sd-data-sheet-column의 헤더 셀에 커스텀 템플릿이 렌더링된다", async () => {
      const fixture = await createAndInit(DSHeaderTplTest);
      const th = getHeaderTh(fixture);
      const customHeader = th.querySelector("em.custom-header");
      expect(customHeader).toBeTruthy();
      expect(customHeader!.textContent).toBe("커스텀 헤더");
      // 기본 텍스트 span은 없어야 한다
      const defaultSpan = th.querySelector("span");
      expect(defaultSpan).toBeFalsy();
    });
  });

  describe("Rule: sd-data-sheet-column에 #headerTpl 미설정 시 기본 텍스트 렌더링", () => {
    beforeEach(() => setupTestBed(DSTestHost));

    it("#headerTpl 미설정 시 기본 텍스트가 렌더링된다", async () => {
      const fixture = await createAndInit(DSTestHost);
      const th = getHeaderTh(fixture);
      expect(th.textContent).toContain("이름");
    });
  });
});
