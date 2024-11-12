import { ChangeDetectionStrategy, Component, contentChildren, input, output, ViewEncapsulation } from "@angular/core";
import { SdTabviewItemControl } from "./SdTabviewItemControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdTabControl } from "./SdTabControl";
import { SdTabItemControl } from "./SdTabItemControl";
import { SdPaneControl } from "./SdPaneControl";
import { $model } from "../utils/$hooks";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDockContainerControl, SdDockControl, SdTabControl, SdTabItemControl, SdPaneControl],
  template: `
    <sd-dock-container>
      <sd-dock>
        <sd-tab [(value)]="value">
          @for (itemControl of itemControls(); track itemControl.value()) {
            <sd-tab-item [value]="itemControl.value()">
              {{ itemControl.header() || itemControl.value() }}
            </sd-tab-item>
          }
        </sd-tab>
      </sd-dock>

      <sd-pane>
        <ng-content></ng-content>
      </sd-pane>
    </sd-dock-container>`,
})
export class SdTabviewControl<T> {
  _value = input<T | undefined>(undefined, { alias: "value" });
  _valueChange = output<T | undefined>({ alias: "valueChange" });
  value = $model(this._value, this._valueChange);

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
