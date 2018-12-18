import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  Injector,
  Input,
  Output,
  QueryList
} from "@angular/core";
import {SdTabviewItemControl} from "./SdTabviewItemControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-tabview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock>
        <sd-tab [(value)]="value" (valueChange)="valueChange.emit($event)">
          <sd-tab-item *ngFor="let itemControl of itemControls; trackBy: trackByValueFn"
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
export class SdTabviewControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ ``;
  }

  @Input()
  public value?: any;

  @Output()
  public readonly valueChange = new EventEmitter<any>();

  @ContentChildren(SdTabviewItemControl)
  public itemControls?: QueryList<SdTabviewItemControl>;

  public trackByValueFn = (i: number, item: any) => item.value || item;

  public constructor(injector: Injector) {
    super(injector);
  }
}