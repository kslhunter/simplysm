import { Component, input, signal } from "@angular/core";
import { vi } from "vitest";
import { SdDataSheet } from "../../../src/features/data-view/sd-data-sheet";
import {
  SdDataSheetBase,
  type SdDataSheetItemPropInfo,
  type SdDataSheetItemInfo,
  type SdDataSheetSearchResult,
} from "../../../src/features/data-view/sd-data-sheet.base";
import { SdDataSheetColumn } from "../../../src/features/data-view/sd-data-sheet-column";

export interface TestItem {
  id: number | undefined;
  name: string;
  isDeleted?: boolean;
}

@Component({
  selector: "ds-test-host",
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn],
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column [key]="'name'" [header]="'이름'" [edit]="true">
        <ng-template #cellTpl let-item>{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class DSTestHost extends SdDataSheetBase<Record<string, any>, TestItem, number | undefined> {
  canUse = signal(true);
  canEdit = signal(true);
  override editMode: "inline" | "modal" | undefined = "inline";
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

  searchFn = vi.fn<
    (usePagination: boolean) => Promise<SdDataSheetSearchResult<TestItem>>
  >();

  bindFilter() {
    return {};
  }

  async search(usePagination: boolean) {
    return this.searchFn(usePagination);
  }
}
