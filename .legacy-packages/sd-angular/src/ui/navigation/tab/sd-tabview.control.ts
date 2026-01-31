import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabItemControl } from "./sd-tab-item.control";
import { SdTabControl } from "./sd-tab.control";
import { SdTabviewItemControl } from "./sd-tabview-item.control";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTabControl, SdTabItemControl],
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
export class SdTabviewControl<T> {
  value = model<T>();

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
