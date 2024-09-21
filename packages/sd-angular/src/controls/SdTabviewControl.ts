import { ChangeDetectionStrategy, Component, contentChildren, model, ViewEncapsulation } from "@angular/core";
import { SdTabviewItemControl } from "./SdTabviewItemControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { SdTabControl } from "./SdTabControl";
import { SdTabItemControl } from "./SdTabItemControl";
import { SdPaneControl } from "./SdPaneControl";

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
    </sd-dock-container>`
})
export class SdTabviewControl<T> {
  value = model<T>();

  itemControls = contentChildren<SdTabviewItemControl<T>>(SdTabviewItemControl);
}
