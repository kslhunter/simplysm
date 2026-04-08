import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabItem } from "./sd-tab-item";
import { SdTab } from "./sd-tab";
import { SdTabviewItem } from "./sd-tabview-item";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTab, SdTabItem],
  host: {
    class: "flex-column fill",
  },
  template: `
    <sd-tab [(value)]="value">
      @for (itemControl of itemControls(); track itemControl.value()) {
        <sd-tab-item [value]="itemControl.value()">
          {{ itemControl.header() || itemControl.value() }}
        </sd-tab-item>
      }
    </sd-tab>

    <div class="flex-fill">
      <ng-content />
    </div>
  `,
})
export class SdTabview<T> {
  value = model<T>();

  itemControls = contentChildren<SdTabviewItem<T>>(SdTabviewItem);
}
