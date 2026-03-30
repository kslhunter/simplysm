import { Component, signal } from "@angular/core";
import type { TSdViewType } from "../../../src/core/utils/useViewTypeSignal";
import { SdBaseContainerControl } from "../../../src/features/base/sd-base-container.control";

@Component({
  selector: "bc-test-host",
  standalone: true,
  imports: [SdBaseContainerControl],
  template: `
    <sd-base-container
      [viewType]="viewType()"
      [header]="header()"
      [restricted]="restricted()"
      [initialized]="initialized()"
      [busy]="busy()"
    >
      <ng-template #contentTpl>
        <div class="test-content">Content</div>
      </ng-template>
      <ng-template #pageTopbarTpl>
        <div class="test-topbar-extra">TopbarExtra</div>
      </ng-template>
      <ng-template #modalBottomTpl>
        <div class="test-modal-bottom">ModalBottom</div>
      </ng-template>
    </sd-base-container>
  `,
})
export class BCTestHost {
  viewType = signal<TSdViewType | undefined>(undefined);
  header = signal<string | undefined>(undefined);
  restricted = signal(false);
  initialized = signal<boolean | undefined>(undefined);
  busy = signal(false);
}
