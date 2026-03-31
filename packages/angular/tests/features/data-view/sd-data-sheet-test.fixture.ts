import { Component, input, signal } from "@angular/core";
import { vi } from "vitest";
import {
  AbsSdDataSheet,
  SdDataSheetControl,
  type ISdDataSheetItemPropInfo,
  type ISdDataSheetItemInfo,
  type ISdDataSheetSearchResult,
} from "../../../src/features/data-view/sd-data-sheet.control";
import { SdDataSheetColumnDirective } from "../../../src/features/data-view/sd-data-sheet-column.directive";

export interface TestItem {
  id: number | undefined;
  name: string;
  isDeleted?: boolean;
}

@Component({
  selector: "ds-test-host",
  standalone: true,
  imports: [SdDataSheetControl, SdDataSheetColumnDirective],
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column [key]="'name'" [header]="'이름'" [edit]="true">
        <ng-template #cellTpl let-item>{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class DSTestHost extends AbsSdDataSheet<Record<string, any>, TestItem, number | undefined> {
  canUse = signal(true);
  canEdit = signal(true);
  override editMode: "inline" | "modal" | undefined = "inline";
  selectMode = input<"single" | "multi" | undefined>(undefined);

  itemPropInfo: ISdDataSheetItemPropInfo<TestItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };

  getItemInfoFn = (item: TestItem): ISdDataSheetItemInfo<number | undefined> => ({
    key: item.id,
    canSelect: true,
    canEdit: true,
    canDelete: true,
  });

  searchFn = vi.fn<
    (usePagination: boolean) => Promise<ISdDataSheetSearchResult<TestItem>>
  >();

  bindFilter() {
    return {};
  }

  async search(usePagination: boolean) {
    return this.searchFn(usePagination);
  }
}
