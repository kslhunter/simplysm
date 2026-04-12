import { Component, signal } from "@angular/core";
import type { SharedDataBase } from "../../../src/core/shared-data/sd-shared-data.provider";
import { SdSharedDataSelectButton } from "../../../src/data/shared-data/sd-shared-data-select-button";
import { SdItemOfTemplate } from "../../../src/core/template/sd-item-of-template";
import type { SdSelectModalInfo, SdSelectModal } from "../../../src/controls/button/sd-modal-select-button";

export interface TestItem extends SharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  name: string;
}

export function testItem(key: number, name: string): TestItem {
  return { __valueKey: key, __searchText: name, __isHidden: false, name };
}

@Component({
  selector: "sdsb-test-host",
  standalone: true,
  imports: [SdSharedDataSelectButton, SdItemOfTemplate],
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
  items = signal<TestItem[]>([]);
  selectMode = signal<"single" | "multi">("single");
  modal = signal<SdSelectModalInfo<SdSelectModal<any>>>({
    title: "Test",
    type: class {} as any,
    inputs: {},
  });
}
