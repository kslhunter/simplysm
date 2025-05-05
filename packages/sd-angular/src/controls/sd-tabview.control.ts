import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabviewItemControl } from "./sd-tabview-item.control";
import { SdDockContainerControl } from "./sd-dock-container.control";
import { SdDockControl } from "./sd-dock.control";
import { SdTabControl } from "./sd-tab.control";
import { SdTabItemControl } from "./sd-tab-item.control";
import { SdPaneControl } from "./sd-pane.control";
import { $model } from "../utils/hooks/hooks";

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
  __value = input<T | undefined>(undefined, { alias: "value" });
  __valueChange = output<T | undefined>({ alias: "valueChange" });
  value = $model(this.__value, this.__valueChange);

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
