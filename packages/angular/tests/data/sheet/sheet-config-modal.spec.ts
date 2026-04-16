import { describe, it, expect, vi } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../src/core/events/sd-option-event.plugin";
import { SdSheetConfigModal } from "../../../src/data/sheet/sd-sheet-config.modal";
import type { SdSheetColumn } from "../../../src/data/sheet/sd-sheet-column";
import type { SdSheetConfig } from "../../../src/data/sheet/types";
import "@simplysm/core-browser";

function mockControl(overrides: Partial<{
  key: string;
  header: string | string[];
  width: string | undefined;
  fixed: boolean;
  hidden: boolean;
  ordering: number;
}>): SdSheetColumn {
  return {
    key: signal(overrides.key ?? "col"),
    header: signal(overrides.header ?? ""),
    width: signal(overrides.width),
    fixed: signal(overrides.fixed ?? false),
    hidden: signal(overrides.hidden ?? false),
    collapse: signal(false),
    disableSorting: signal(false),
    disableResizing: signal(false),
    ordering: signal(overrides.ordering ?? 0),
    cellTplRef: signal(null),
    summaryTplRef: signal(null),
  } as unknown as SdSheetColumn;
}

function createModal(
  controls: SdSheetColumn[],
  config: SdSheetConfig | undefined = undefined,
) {
  const fixture = TestBed.configureTestingModule({
    imports: [SdSheetConfigModal],
    providers: [
      { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    ],
  }).createComponent(SdSheetConfigModal);

  fixture.componentRef.setInput("sheetKey", "test-sheet");
  fixture.componentRef.setInput("controls", controls);
  fixture.componentRef.setInput("config", config);
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();

  return fixture;
}

describe("Feature 6.2 Slice 4: SdSheetConfigModal", () => {
  it("Scenario: 설정 모달 열기 — 컬럼 목록이 표시된다", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름", width: "200px" }),
      mockControl({ key: "age", header: "나이", width: "100px" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const rows = host.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    // Check headers are displayed (nth-child(4): feature-cell, fixed, ordering, header)
    const headerCells = host.querySelectorAll("tbody tr td:nth-child(4)");
    expect(headerCells[0].textContent.trim()).toBe("이름");
    expect(headerCells[1].textContent.trim()).toBe("나이");
  });

  it("Scenario: OK로 설정 저장", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름", width: "200px" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const host = fixture.nativeElement as HTMLElement;
    // Action buttons order: [Reset(nested), OK, Cancel]
    const actionBtns = host.querySelectorAll(".p-sm-default sd-button");
    const okBtn = actionBtns[1] as HTMLElement;
    okBtn.click();
    fixture.detectChanges();

    expect(emitted).toBeTruthy();
    expect(emitted!.columnRecord["name"]).toBeTruthy();
  });

  it("Scenario: Cancel로 설정 취소", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    let emitted: SdSheetConfig | undefined | null = null;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const host = fixture.nativeElement as HTMLElement;
    const actionBtns = host.querySelectorAll(".p-sm-default sd-button");
    const cancelBtn = actionBtns[2] as HTMLElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(emitted).toBeUndefined();
  });

  it("Scenario: Reset으로 설정 초기화", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름" }),
    ];
    const config: SdSheetConfig = {
      columnRecord: { name: { width: "300px" } },
    };
    const fixture = createModal(controls, config);
    await fixture.whenStable();

    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const host = fixture.nativeElement as HTMLElement;
    const actionBtns = host.querySelectorAll(".p-sm-default sd-button");
    const resetBtn = actionBtns[0] as HTMLElement;
    resetBtn.click();
    fixture.detectChanges();

    expect(emitted).toEqual({ columnRecord: {} });
  });

  it("Scenario: 컬럼 순서 변경 — 고정 경계 제약", async () => {
    const controls = [
      mockControl({ key: "a", header: "A", fixed: true, ordering: 0 }),
      mockControl({ key: "b", header: "B", fixed: false, ordering: 1 }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const rows = host.querySelectorAll("tbody tr");

    // Row 1 (B, non-fixed) — ordering column is td:nth-child(3), uses sd-anchor
    const anchors = rows[1].querySelectorAll("td:nth-child(3) sd-anchor");
    const moveUpAnchor = anchors[0] as HTMLElement;
    expect(moveUpAnchor.getAttribute("data-sd-disabled")).toBe("true");
  });

  it("Scenario: 컬럼 숨김 토글", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    // Hidden column is td:nth-child(6): feature-cell, fixed, ordering, header, width, hidden
    const hiddenCheckbox = host.querySelector("tbody tr td:nth-child(6) sd-checkbox") as HTMLElement;
    expect(hiddenCheckbox).toBeTruthy();

    hiddenCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // After clicking OK, the hidden state should be reflected
    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const okBtn = host.querySelectorAll(".p-sm-default sd-button")[1] as HTMLElement;
    okBtn.click();
    fixture.detectChanges();

    expect(emitted!.columnRecord["name"].hidden).toBe(true);
  });

  it("Scenario: 컬럼 고정 토글", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름", fixed: false }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    // Fixed column is td:nth-child(2): feature-cell, fixed
    const fixCheckbox = host.querySelector("tbody tr td:nth-child(2) sd-checkbox") as HTMLElement;
    fixCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();

    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const okBtn = host.querySelectorAll(".p-sm-default sd-button")[1] as HTMLElement;
    okBtn.click();
    fixture.detectChanges();

    expect(emitted!.columnRecord["name"].fixed).toBe(true);
  });

  it("Scenario: 3개 버튼(Reset, OK, Cancel)에 min-width 60px 적용", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const actionButtons = host.querySelectorAll(
      ".p-sm-default.flex-row sd-button button",
    );
    expect(actionButtons.length).toBe(3);

    for (const btn of Array.from(actionButtons)) {
      expect((btn as HTMLElement).style.minWidth).toBe("60px");
    }
  });

});
