import { Component, signal } from "@angular/core";
import type { SharedDataBase } from "../../../src/core/providers/sd-shared-data.provider";
import { SdSharedDataSelect } from "../../../src/features/shared-data/sd-shared-data-select";
import { SdItemOfTemplate } from "../../../src/core/directives/sd-item-of-template";
import type { SdSelectModalInfo, SdSelectModal } from "../../../src/ui/form/button/sd-modal-select-button";

export interface TestSharedItem extends SharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: number;
  name: string;
  order?: number;
}

export function item(
  key: number,
  name: string,
  opts?: { hidden?: boolean; parentKey?: number; order?: number },
): TestSharedItem {
  return {
    __valueKey: key,
    __searchText: name,
    __isHidden: opts?.hidden ?? false,
    __parentKey: opts?.parentKey,
    name,
    order: opts?.order,
  };
}

@Component({
  selector: "sd-shared-data-select-test-host",
  standalone: true,
  imports: [SdSharedDataSelect, SdItemOfTemplate],
  template: `
    <sd-shared-data-select
      [(value)]="value"
      [items]="items()"
      [selectMode]="selectMode()"
      [disabled]="disabled()"
      [required]="required()"
      [filterFn]="filterFn()"
      [displayOrderKeyProp]="displayOrderKeyProp()"
      [modal]="modal()"
    >
      <ng-template [itemOf]="items()" let-item>
        <span class="item-name">{{ item.name }}</span>
      </ng-template>
    </sd-shared-data-select>
  `,
})
export class SharedDataSelectTestHost {
  value = signal<number | number[] | undefined>(undefined);
  items = signal<TestSharedItem[]>([]);
  selectMode = signal<"single" | "multi">("single");
  disabled = signal(false);
  required = signal(false);
  filterFn = signal<((item: TestSharedItem, index: number) => boolean) | undefined>(undefined);
  displayOrderKeyProp = signal<string | undefined>(undefined);
  modal = signal<SdSelectModalInfo<SdSelectModal<any>> | undefined>(undefined);
}
