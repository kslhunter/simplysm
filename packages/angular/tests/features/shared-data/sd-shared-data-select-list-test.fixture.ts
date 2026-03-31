import { Component, signal } from "@angular/core";
import type { ISharedDataBase } from "../../../src/core/providers/sd-shared-data.provider";
import { SdSharedDataSelectListControl } from "../../../src/features/shared-data/sd-shared-data-select-list.control";
import { SdItemOfTemplateDirective } from "../../../src/core/directives/sd-item-of-template.directive";
import type { TSdSelectModalInfo, ISdSelectModal } from "../../../src/ui/form/button/sd-modal-select-button.control";

export interface ITestListItem extends ISharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  name: string;
}

export function listItem(
  key: number,
  name: string,
  opts?: { hidden?: boolean },
): ITestListItem {
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
  imports: [SdSharedDataSelectListControl, SdItemOfTemplateDirective],
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
  selectedItem = signal<ITestListItem | undefined>(undefined);
  items = signal<ITestListItem[]>([]);
  canChangeFn = signal<(item: ITestListItem | undefined) => boolean | Promise<boolean>>(() => true);
  filterFn = signal<((item: ITestListItem, index: number) => boolean) | undefined>(undefined);
  pageItemCount = signal<number | undefined>(undefined);
  useUndefined = signal(false);
  modal = signal<TSdSelectModalInfo<ISdSelectModal<any>> | undefined>(undefined);
}
