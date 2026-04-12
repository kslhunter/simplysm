import { Component, signal } from "@angular/core";
import { vi } from "vitest";
import { SdDataSelectButton } from "../../../src/data/data-select-button/sd-data-select-button";
import { SdDataSelectButtonBase } from "../../../src/data/data-select-button/sd-data-select-button.base";
import type { SdSelectModalInfo } from "../../../src/controls/button/sd-modal-select-button";
import { SdItemOfTemplate } from "../../../src/core/template/sd-item-of-template";

export interface TestSelectItem {
  id: number;
  name: string;
}

@Component({
  selector: "dsb-test-host",
  standalone: true,
  imports: [SdDataSelectButton, SdItemOfTemplate],
  template: `
    <sd-data-select-button>
      <ng-template [itemOf]="selectedItems()" let-item>
        <span class="item-text">{{ item.name }}</span>
      </ng-template>
    </sd-data-select-button>
  `,
})
export class DSBTestHost extends SdDataSelectButtonBase<TestSelectItem, number> {
  loadFn = vi.fn<(keys: number[]) => Promise<TestSelectItem[]>>();

  modal = signal<SdSelectModalInfo<any>>({
    title: "테스트 선택",
    type: class {} as any,
    inputs: {},
  });

  async load(keys: number[]): Promise<TestSelectItem[]> {
    return this.loadFn(keys);
  }
}

