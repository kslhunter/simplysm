import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdSelectPreselectedTest } from "./sd-select-test.fixture";
import { SdSelect } from "../../../src/controls/select/sd-select";
import { SdSelectItem } from "../../../src/controls/select/sd-select-item";
import "@simplysm/core-browser";

function setupTestBed(component: any) {
  TestBed.configureTestingModule({
    imports: [component],
  });
}

function getSelectControl(fixture: any): SdSelect<"single", string> {
  const selectEl = fixture.nativeElement.querySelector("sd-select");
  return fixture.debugElement.query(
    (de: any) => de.nativeElement === selectEl,
  ).componentInstance as SdSelect<"single", string>;
}

function getTriggerText(fixture: any): string {
  const contentEl = fixture.nativeElement.querySelector(
    "sd-select ._sd-select-control-content",
  ) as HTMLElement | null;
  return (contentEl?.textContent ?? "").trim();
}

describe("Feature 3.4 Slice 1: sd-select single mode stale 방지", () => {
  it("Scenario: contentHTML이 빈 문자열일 때 이전 표시가 초기화된다", async () => {
    setupTestBed(SdSelectPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectCtrl = getSelectControl(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(getTriggerText(fixture)).toContain("Item A");
    });

    // B의 contentHTML을 빈 문자열로 설정 (미렌더 상태 시뮬레이션)
    const itemB = selectCtrl._itemControls().find(
      (item: SdSelectItem<string>) => item.value() === "B",
    );
    itemB!.contentHTML.set("");

    // 값을 B로 변경
    fixture.componentInstance.value.set("B");
    fixture.detectChanges();
    TestBed.flushEffects();

    // stale A 표시가 아닌 undefined여야 한다
    expect(selectCtrl._selectedItemContentHTML()).toBeUndefined();
  });

  it("Scenario: contentHTML이 정상 반환될 때 표시가 갱신된다", async () => {
    setupTestBed(SdSelectPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    await vi.waitFor(() => {
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(getTriggerText(fixture)).toContain("Item A");
    });

    // 값을 B로 변경 (B의 contentHTML은 정상)
    fixture.componentInstance.value.set("B");
    fixture.detectChanges();
    TestBed.flushEffects();
    await vi.waitFor(() => {
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(getTriggerText(fixture)).toContain("Item B");
    });
  });

  it("값이 undefined로 변경되면 표시가 초기화된다", async () => {
    setupTestBed(SdSelectPreselectedTest);
    const fixture = TestBed.createComponent(SdSelectPreselectedTest);
    fixture.detectChanges();
    TestBed.flushEffects();

    const selectCtrl = getSelectControl(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(getTriggerText(fixture)).toContain("Item A");
    });

    fixture.componentInstance.value.set(undefined);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(selectCtrl._selectedItemContentHTML()).toBeUndefined();
  });
});
