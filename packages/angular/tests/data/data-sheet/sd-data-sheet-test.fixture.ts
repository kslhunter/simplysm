import { Component, input, signal } from "@angular/core";
import { vi } from "vitest";
import { SdDataSheet } from "../../../src/data/data-sheet/sd-data-sheet";
import {
  SdDataSheetBase,
  type SdDataSheetItemInfo,
  type SdDataSheetItemPropInfo,
  type SdDataSheetSearchResult,
} from "../../../src/data/data-sheet/sd-data-sheet.base";
import { SdDataSheetColumn } from "../../../src/data/data-sheet/sd-data-sheet-column";
import { SdSheetColumnCellTemplate } from "../../../src/data/sheet/sd-sheet-column-cell-template";

export interface TestItem {
  id: number | undefined;
  name: string;
  isDeleted?: boolean;
}

@Component({
  selector: "ds-test-host",
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn, SdSheetColumnCellTemplate],
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column [key]="'name'" [header]="'이름'" [edit]="true">
        <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class DSTestHost extends SdDataSheetBase<Record<string, any>, TestItem, number | undefined> {
  canUse = signal(true);
  canEdit = signal(true);
  override editMode: "inline" | "modal" = "inline";
  selectMode = input<"single" | "multi" | undefined>(undefined);

  itemPropInfo: SdDataSheetItemPropInfo<TestItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };

  getItemInfoFn = (item: TestItem): SdDataSheetItemInfo<number | undefined> => ({
    key: item.id,
    canSelect: true,
    canEdit: true,
    canDelete: true,
  });

  searchFn = vi.fn<(usePagination: boolean) => Promise<SdDataSheetSearchResult<TestItem>>>();

  bindFilter() {
    return {};
  }

  async search(usePagination: boolean) {
    return this.searchFn(usePagination);
  }
}

// --- Feature 1.2: headerStyle/tooltip/headerTplRef 전파 fixtures ---

@Component({
  selector: "ds-header-style-test",
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn, SdSheetColumnCellTemplate],
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column [key]="'name'" [header]="'이름'" [headerStyle]="'color: red'">
        <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class DSHeaderStyleTest extends SdDataSheetBase<
  Record<string, any>,
  TestItem,
  number | undefined
> {
  canUse = signal(true);
  canEdit = signal(true);
  override editMode: "inline" | "modal" = "inline";
  selectMode = input<"single" | "multi" | undefined>(undefined);
  itemPropInfo: SdDataSheetItemPropInfo<TestItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };
  getItemInfoFn = (item: TestItem): SdDataSheetItemInfo<number | undefined> => ({
    key: item.id,
    canSelect: true,
    canEdit: true,
    canDelete: true,
  });
  searchFn = vi.fn<(usePagination: boolean) => Promise<SdDataSheetSearchResult<TestItem>>>();
  bindFilter() {
    return {};
  }
  async search(usePagination: boolean) {
    return this.searchFn(usePagination);
  }
}

@Component({
  selector: "ds-tooltip-test",
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn, SdSheetColumnCellTemplate],
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column [key]="'name'" [header]="'이름'" [tooltip]="'이 컬럼은 수량입니다'">
        <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class DSTooltipTest extends SdDataSheetBase<
  Record<string, any>,
  TestItem,
  number | undefined
> {
  canUse = signal(true);
  canEdit = signal(true);
  override editMode: "inline" | "modal" = "inline";
  selectMode = input<"single" | "multi" | undefined>(undefined);
  itemPropInfo: SdDataSheetItemPropInfo<TestItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };
  getItemInfoFn = (item: TestItem): SdDataSheetItemInfo<number | undefined> => ({
    key: item.id,
    canSelect: true,
    canEdit: true,
    canDelete: true,
  });
  searchFn = vi.fn<(usePagination: boolean) => Promise<SdDataSheetSearchResult<TestItem>>>();
  bindFilter() {
    return {};
  }
  async search(usePagination: boolean) {
    return this.searchFn(usePagination);
  }
}

@Component({
  selector: "ds-header-tpl-test",
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn, SdSheetColumnCellTemplate],
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column [key]="'name'" [header]="'이름'">
        <ng-template #headerTpl><em class="custom-header">커스텀 헤더</em></ng-template>
        <ng-template [cell]="items()" let-item="item">{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class DSHeaderTplTest extends SdDataSheetBase<
  Record<string, any>,
  TestItem,
  number | undefined
> {
  canUse = signal(true);
  canEdit = signal(true);
  override editMode: "inline" | "modal" = "inline";
  selectMode = input<"single" | "multi" | undefined>(undefined);
  itemPropInfo: SdDataSheetItemPropInfo<TestItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };
  getItemInfoFn = (item: TestItem): SdDataSheetItemInfo<number | undefined> => ({
    key: item.id,
    canSelect: true,
    canEdit: true,
    canDelete: true,
  });
  searchFn = vi.fn<(usePagination: boolean) => Promise<SdDataSheetSearchResult<TestItem>>>();
  bindFilter() {
    return {};
  }
  async search(usePagination: boolean) {
    return this.searchFn(usePagination);
  }
}
