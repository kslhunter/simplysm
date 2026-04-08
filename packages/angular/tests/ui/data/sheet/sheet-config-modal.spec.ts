import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdOptionEventPlugin } from "../../../../src/core/plugins/events/sd-option-event.plugin";
import { SdSheetConfigModal } from "../../../../src/ui/data/sheet/sd-sheet-config.modal";
import type { SdSheetColumn } from "../../../../src/ui/data/sheet/sd-sheet-column";
import type { SdSheetConfig } from "../../../../src/ui/data/sheet/types";
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

  fixture.componentRef.setInput("controls", controls);
  fixture.componentRef.setInput("config", config);
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

    // Check headers are displayed
    const headerCells = host.querySelectorAll("tbody tr td:nth-child(3)");
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
    const okBtn = host.querySelector("._actions sd-button") as HTMLElement;
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
    const buttons = host.querySelectorAll("._actions sd-button");
    const cancelBtn = buttons[1] as HTMLElement;
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

    const host = fixture.nativeElement as HTMLElement;
    const buttons = host.querySelectorAll("._actions sd-button");
    const resetBtn = buttons[2] as HTMLElement;
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

    // Row 1 (B, non-fixed) should have disabled move-up button
    const moveUpBtns = rows[1].querySelectorAll("._order-col sd-button");
    const moveUpBtn = moveUpBtns[0] as HTMLElement;
    expect(moveUpBtn.getAttribute("data-sd-disabled")).toBe("true");
  });

  it("Scenario: 컬럼 숨김 토글", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const hiddenCheckbox = host.querySelector("tbody tr td:nth-child(5) sd-checkbox") as HTMLElement;
    expect(hiddenCheckbox).toBeTruthy();

    hiddenCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // After clicking OK, the hidden state should be reflected
    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const okBtn = host.querySelector("._actions sd-button") as HTMLElement;
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
    const fixCheckbox = host.querySelector("tbody tr td:first-child sd-checkbox") as HTMLElement;
    fixCheckbox.click();
    fixture.detectChanges();
    await fixture.whenStable();

    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const okBtn = host.querySelector("._actions sd-button") as HTMLElement;
    okBtn.click();
    fixture.detectChanges();

    expect(emitted!.columnRecord["name"].fixed).toBe(true);
  });

  it("Scenario: 컬럼 너비 변경", async () => {
    const controls = [
      mockControl({ key: "name", header: "이름", width: "200px" }),
    ];
    const fixture = createModal(controls);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const widthInput = host.querySelector("._width-input") as HTMLInputElement;
    expect(widthInput).toBeTruthy();
    expect(widthInput.value).toBe("200px");

    widthInput.value = "300px";
    widthInput.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    let emitted: SdSheetConfig | undefined;
    fixture.componentInstance.close.subscribe((v: SdSheetConfig | undefined) => {
      emitted = v;
    });

    const okBtn = host.querySelector("._actions sd-button") as HTMLElement;
    okBtn.click();
    fixture.detectChanges();

    expect(emitted!.columnRecord["name"].width).toBe("300px");
  });
});
