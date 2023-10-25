import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList
} from "@angular/core";
import {SdTabviewItemControl} from "./SdTabviewItemControl";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdDockControl} from "./SdDockControl";
import {SdTabControl} from "./SdTabControl";
import {SdTabItemControl} from "./SdTabItemControl";
import {NgForOf} from "@angular/common";
import {SdPaneControl} from "./SdPaneControl";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdDockContainerControl,
    SdDockControl,
    SdTabControl,
    SdTabItemControl,
    NgForOf,
    SdPaneControl
  ],
  template: `
    <sd-dock-container>
      <sd-dock>
        <sd-tab [value]="value" (valueChange)="onValueChange($event)">
          <sd-tab-item *ngFor="let itemControl of itemControls; trackBy: trackByFnForItemControl"
                       [value]="itemControl.value">
            {{ itemControl.header || itemControl.value }}
          </sd-tab-item>
        </sd-tab>
      </sd-dock>

      <sd-pane>
        <ng-content></ng-content>
      </sd-pane>
    </sd-dock-container>`
})
export class SdTabviewControl {
  @Input()
  value?: any;

  @Output()
  valueChange = new EventEmitter<any>();

  @ContentChildren(SdTabviewItemControl)
  itemControls?: QueryList<SdTabviewItemControl>;

  trackByFnForItemControl = (i: number, item: SdTabviewItemControl): any => item.value ?? item;

  onValueChange(value: any) {
    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }
}
