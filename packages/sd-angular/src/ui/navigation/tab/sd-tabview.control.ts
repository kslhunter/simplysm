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
import { SdFlexGrowDirective } from "../../layout/flex/sd-flex-grow.directive";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTabControl, SdTabItemControl, SdFlexGrowDirective],
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

    <div [sd-flex-grow]="'fill'">
      <ng-content />
    </div>
  `,
})
export class SdTabviewControl<T> {
  value = model<T>();

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
