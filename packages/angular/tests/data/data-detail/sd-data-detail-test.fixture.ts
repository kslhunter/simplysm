import { Component, signal } from "@angular/core";
import { vi } from "vitest";
import { SdDataDetail } from "../../../src/data/data-detail/sd-data-detail";
import {
  SdDataDetailBase,
  type SdDataDetailDataInfo,
} from "../../../src/data/data-detail/sd-data-detail.base";

export interface TestDetailItem {
  id: number | undefined;
  name: string;
}

@Component({
  selector: "dd-test-host",
  standalone: true,
  imports: [SdDataDetail],
  template: `
    <sd-data-detail>
      <ng-template #contentTpl>
        <div class="test-content">{{ data().name }}</div>
      </ng-template>
    </sd-data-detail>
  `,
})
export class DDTestHost extends SdDataDetailBase<TestDetailItem> {
  canUse = signal(true);
  canEdit = signal(true);

  loadFn = vi.fn<() => Promise<{ data: TestDetailItem; info: SdDataDetailDataInfo }>>();

  submitFn = vi.fn<(data: TestDetailItem) => Promise<boolean | undefined>>();

  toggleDeleteFn = vi.fn<(del: boolean) => Promise<boolean | undefined>>();

  async load() {
    return this.loadFn();
  }

  override async submit(data: TestDetailItem) {
    return this.submitFn(data);
  }

  override async toggleDelete(del: boolean) {
    return this.toggleDeleteFn(del);
  }
}
