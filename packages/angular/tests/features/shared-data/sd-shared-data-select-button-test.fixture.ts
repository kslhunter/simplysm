import { Component, signal } from "@angular/core";
import type { ISharedDataBase } from "../../../src/core/providers/sd-shared-data.provider";
import { SdSharedDataSelectButtonControl } from "../../../src/features/shared-data/sd-shared-data-select-button.control";
import { SdItemOfTemplateDirective } from "../../../src/core/directives/sd-item-of-template.directive";
import type { TSdSelectModalInfo, ISdSelectModal } from "../../../src/ui/form/button/sd-modal-select-button.control";

export interface ITestItem extends ISharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  name: string;
}

export function testItem(key: number, name: string): ITestItem {
  return { __valueKey: key, __searchText: name, __isHidden: false, name };
}

@Component({
  selector: "sdsb-test-host",
  standalone: true,
  imports: [SdSharedDataSelectButtonControl, SdItemOfTemplateDirective],
  template: `
    <sd-shared-data-select-button
      [(value)]="value"
      [items]="items()"
      [modal]="modal()"
      [selectMode]="selectMode()"
    >
      <ng-template [itemOf]="items()" let-item>
        <span class="item-name">{{ item.name }}</span>
      </ng-template>
    </sd-shared-data-select-button>
  `,
})
export class SDSBTestHost {
  value = signal<number | undefined>(undefined);
  items = signal<ITestItem[]>([]);
  selectMode = signal<"single" | "multi">("single");
  modal = signal<TSdSelectModalInfo<ISdSelectModal<any>>>({
    title: "Test",
    type: class {} as any,
    inputs: {},
  });
}
