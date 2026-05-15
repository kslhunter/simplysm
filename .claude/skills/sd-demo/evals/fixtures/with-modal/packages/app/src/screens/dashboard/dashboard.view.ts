import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from "@angular/core";
import { SdBaseContainer, injectViewTypeSignal } from "@simplysm/angular";

@Component({
  selector: "app-dashboard-view",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [SdBaseContainer],
  template: `
    <sd-base-container
      [(ready)]="ready"
      [initialized]="initialized()"
      [(busyCount)]="busyCount"
      [viewType]="viewType()"
    >
      <ng-template #contentTpl>
        <div class="p-default">대시보드</div>
      </ng-template>
    </sd-base-container>
  `,
})
export class DashboardView {
  ready = signal(false);
  initialized = signal(true);
  busyCount = signal(0);
  viewType = injectViewTypeSignal();
}
