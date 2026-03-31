import { Component, signal } from "@angular/core";
import { vi } from "vitest";
import {
  AbsSdDataSelectButton,
  SdDataSelectButtonControl,
} from "../../../src/features/data-view/sd-data-select-button.control";
import type { TSdSelectModalInfo } from "../../../src/ui/form/button/sd-modal-select-button.control";
import { SdItemOfTemplateDirective } from "../../../src/core/directives/sd-item-of-template.directive";

export interface TestSelectItem {
  id: number;
  name: string;
}

@Component({
  selector: "dsb-test-host",
  standalone: true,
  imports: [SdDataSelectButtonControl, SdItemOfTemplateDirective],
  template: `
    <sd-data-select-button>
      <ng-template [itemOf]="selectedItems()" let-item>
        <span class="item-text">{{ item.name }}</span>
      </ng-template>
    </sd-data-select-button>
  `,
})
export class DSBTestHost extends AbsSdDataSelectButton<TestSelectItem, number> {
  loadFn = vi.fn<(keys: number[]) => Promise<TestSelectItem[]>>();

  modal = signal<TSdSelectModalInfo<any>>({
    title: "테스트 선택",
    type: class {} as any,
    inputs: {},
  });

  async load(keys: number[]): Promise<TestSelectItem[]> {
    return this.loadFn(keys);
  }
}

