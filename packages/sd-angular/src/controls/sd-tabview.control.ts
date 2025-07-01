import { ChangeDetectionStrategy, Component, contentChildren, model, ViewEncapsulation } from "@angular/core";
import { SdTabItemControl } from "./sd-tab-item.control";
import { SdTabControl } from "./sd-tab.control";
import { SdTabviewItemControl } from "./sd-tabview-item.control";
import { SdFlexControl } from "./flex/sd-flex.control";
import { SdFlexItemControl } from "./flex/sd-flex-item.control";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTabControl, SdTabItemControl, SdFlexControl, SdFlexItemControl],
  template: `
    <sd-flex vertical>
      <sd-flex-item>
        <sd-tab [(value)]="value">
          @for (itemControl of itemControls(); track itemControl.value()) {
            <sd-tab-item [value]="itemControl.value()">
              {{ itemControl.header() || itemControl.value() }}
            </sd-tab-item>
          }
        </sd-tab>
      </sd-flex-item>

      <sd-flex-item fill>
        <ng-content></ng-content>
      </sd-flex-item>
    </sd-flex>
  `,
})
export class SdTabviewControl<T> {
  value = model<T>();

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
