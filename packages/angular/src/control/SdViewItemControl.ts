import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Injector} from "@angular/core";
import {SdViewControl} from "./SdViewControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdViewItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: none;

        &[sd-selected=true] {
          display: block;
        }
      }`;
  }

  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(injector: Injector,
                     @Inject(forwardRef(() => SdViewControl))
                     private readonly _parentControl: SdViewControl) {
    super(injector);
  }
}