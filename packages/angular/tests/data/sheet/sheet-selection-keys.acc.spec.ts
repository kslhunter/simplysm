import { describe, it, expect } from "vitest";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SdSheet } from "../../../src/data/sheet/sd-sheet";
import { SdSheetColumn } from "../../../src/data/sheet/sd-sheet-column";
import { SdSheetColumnCellTemplate } from "../../../src/data/sheet/sd-sheet-column-cell-template";

interface TestItem {
  id: number;
  name: string;
}

@Component({
  selector: "sd-sheet-keys-single-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'single'"
      [trackByFn]="trackByFn"
      [(selectedKeys)]="selectedKeys"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
class KeysSingleTest {
  items = signal<TestItem[]>([
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
  ]);
  selectedKeys = signal<number[]>([]);
  trackByFn = (item: TestItem) => item.id;
}

@Component({
  selector: "sd-sheet-keys-multi-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'multi'"
      [trackByFn]="trackByFn"
      [(selectedKeys)]="selectedKeys"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
class KeysMultiTest {
  items = signal<TestItem[]>([
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
  ]);
  selectedKeys = signal<number[]>([]);
  trackByFn = (item: TestItem) => item.id;
}

@Component({
  selector: "sd-sheet-keys-disabled-test",
  template: `
    <sd-sheet
      [items]="items()"
      [selectMode]="'multi'"
      [trackByFn]="trackByFn"
      [(selectedKeys)]="selectedKeys"
      [getItemSelectableFn]="selectableFn"
    >
      <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
        <ng-template [cell]="items()">name</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
  standalone: true,
  imports: [SdSheet, SdSheetColumn, SdSheetColumnCellTemplate],
})
class KeysDisabledTest {
  items = signal<TestItem[]>([
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
  ]);
  selectedKeys = signal<number[]>([]);
  trackByFn = (item: TestItem) => item.id;
  selectableFn = (item: TestItem): boolean | string => {
    if (item.name === "C") return "권한 없음";
    return true;
  };
}

describe("Feature 1.2: SdSheet selectedKeys 전환", () => {
  describe("Rule: SdSheet model은 selectedKeys: unknown[]로 노출한다", () => {
    it("Scenario: 단일 선택 시 선택된 key가 selectedKeys에 반영된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [KeysSingleTest],
      }).createComponent(KeysSingleTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const anchors = (fixture.nativeElement as HTMLElement).querySelectorAll(
        "tbody tr td._feature-cell sd-anchor",
      );

      (anchors[1] as HTMLElement).dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedKeys()).toEqual([2]);
    });

    it("Scenario: 다중 선택 시 선택된 key들이 selectedKeys에 반영된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [KeysMultiTest],
      }).createComponent(KeysMultiTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
        "tbody tr td._feature-cell sd-checkbox",
      );

      (checkboxes[0] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      (checkboxes[1] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedKeys()).toEqual([1, 2]);
    });

    it("Scenario: 전체 선택/해제 시 selectedKeys가 갱신된다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [KeysMultiTest],
      }).createComponent(KeysMultiTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const headerCheckbox = (fixture.nativeElement as HTMLElement).querySelector(
        "thead th._feature-cell sd-checkbox",
      ) as HTMLElement;

      headerCheckbox.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.selectedKeys()).toEqual([1, 2, 3]);

      headerCheckbox.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.selectedKeys()).toEqual([]);
    });
  });

  describe("Rule: injectSheetSelectRowIndicator는 key 기반으로 행 위치를 산출한다", () => {
    it("Scenario: 선택된 key에 해당하는 행의 selectedKeys 길이가 1이다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [KeysMultiTest],
      }).createComponent(KeysMultiTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
        "tbody tr td._feature-cell sd-checkbox",
      );
      (checkboxes[0] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedKeys().length).toBe(1);
    });

    it("Scenario: 선택 불가 행은 선택되지 않는다", async () => {
      const fixture = TestBed.configureTestingModule({
        imports: [KeysDisabledTest],
      }).createComponent(KeysDisabledTest);
      fixture.detectChanges();
      await fixture.whenStable();

      const checkboxes = (fixture.nativeElement as HTMLElement).querySelectorAll(
        "tbody tr td._feature-cell sd-checkbox",
      );
      (checkboxes[2] as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.selectedKeys()).toEqual([]);
    });
  });
});
