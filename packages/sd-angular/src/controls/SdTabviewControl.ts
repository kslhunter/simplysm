import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewEncapsulation,
} from "@angular/core";
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
  template: ` <sd-dock-container>
    <sd-dock>
      <sd-tab [value]="value" (valueChange)="onValueChange($event)">
        @for (itemControl of itemControls; track itemControl.value) {
          <sd-tab-item [value]="itemControl.value">
            {{ itemControl.header || itemControl.value }}
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
  @Input() value?: T;
  @Output() valueChange = new EventEmitter<T>();

  @ContentChildren(SdTabviewItemControl) itemControls!: QueryList<SdTabviewItemControl<T>>;

  onValueChange(value: any) {
    if (this.value !== value) {
      this.value = value;
      this.valueChange.emit(value);
    }
  }
}
