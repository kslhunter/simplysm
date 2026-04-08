import { Component, signal } from "@angular/core";
import type { SharedDataBase } from "../../../src/core/providers/sd-shared-data.provider";
import { SdSharedDataSelectList } from "../../../src/features/shared-data/sd-shared-data-select-list";
import { SdItemOfTemplate } from "../../../src/core/directives/sd-item-of-template";
import type { SdSelectModalInfo, SdSelectModal } from "../../../src/ui/form/button/sd-modal-select-button";

export interface TestListItem extends SharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  name: string;
}

export function listItem(
  key: number,
  name: string,
  opts?: { hidden?: boolean },
): TestListItem {
  return {
    __valueKey: key,
    __searchText: name,
    __isHidden: opts?.hidden ?? false,
    name,
  };
}

@Component({
  selector: "sdsl-test-host",
  standalone: true,
  imports: [SdSharedDataSelectList, SdItemOfTemplate],
  template: `
    <sd-shared-data-select-list
      [(selectedItem)]="selectedItem"
      [items]="items()"
      [canChangeFn]="canChangeFn()"
      [filterFn]="filterFn()"
      [pageItemCount]="pageItemCount()"
      [useUndefined]="useUndefined()"
      [modal]="modal()"
    >
      <ng-template [itemOf]="items()" let-item>
        <span class="item-name">{{ item.name }}</span>
      </ng-template>
    </sd-shared-data-select-list>
  `,
})
export class SDSLTestHost {
  selectedItem = signal<TestListItem | undefined>(undefined);
  items = signal<TestListItem[]>([]);
  canChangeFn = signal<(item: TestListItem | undefined) => boolean | Promise<boolean>>(() => true);
  filterFn = signal<((item: TestListItem, index: number) => boolean) | undefined>(undefined);
  pageItemCount = signal<number | undefined>(undefined);
  useUndefined = signal(false);
  modal = signal<SdSelectModalInfo<SdSelectModal<any>> | undefined>(undefined);
}
