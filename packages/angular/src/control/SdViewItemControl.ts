import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject} from "@angular/core";
import {SdViewControl} from "./SdViewControl";


@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdViewItemControl {


  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdViewControl))
                     private readonly _parentControl: SdViewControl) {
  }
}