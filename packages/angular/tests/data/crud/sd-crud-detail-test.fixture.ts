import { Component, input, model } from "@angular/core";
import { SdCrudDetail } from "../../../src/data/crud/sd-crud-detail";
import type { SdViewType } from "../../../src/core/routing/injectViewTypeSignal";

@Component({
  selector: "sd-crud-detail-test",
  template: `<sd-crud-detail
    [(ready)]="ready"
    [initialized]="initialized()"
    [(busyCount)]="busyCount"
    [restricted]="restricted()"
    [readonly]="readonly()"
    [viewType]="viewType()"
    (submit)="onSubmit()"
  >
    <ng-template #contentTpl>
      <p class="test-content">detail content</p>
    </ng-template>
  </sd-crud-detail>`,
  standalone: true,
  imports: [SdCrudDetail],
})
export class SdCrudDetailTestHost {
  ready = model(false);
  initialized = input(false);
  busyCount = model(0);
  restricted = input(false);
  readonly = input(false);
  viewType = input<SdViewType>("page");
  submitCount = 0;

  onSubmit() {
    this.submitCount++;
  }
}
