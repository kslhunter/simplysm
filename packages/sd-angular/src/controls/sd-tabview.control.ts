import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdDockContainerControl } from "./sd-dock-container.control";
import { SdDockControl } from "./sd-dock.control";
import { SdPaneControl } from "./sd-pane.control";
import { SdTabItemControl } from "./sd-tab-item.control";
import { SdTabControl } from "./sd-tab.control";
import { SdTabviewItemControl } from "./sd-tabview-item.control";

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
    </sd-dock-container>
  `,
})
export class SdTabviewControl<T> {
  value = model<T>();

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
