import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Injector, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";
import {SdTabviewControl} from "./SdTabviewControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTabviewItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ `
      :host {
        display: none;

        &[sd-selected=true] {
          display: block;
        }
      }`;
  }

  @Input()
  public value?: any;

  @Input()
  @SdTypeValidate(String)
  public header?: string;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(injector: Injector,
                     @Inject(forwardRef(() => SdTabviewControl))
                     private readonly _parentControl: SdTabviewControl) {
    super(injector);
  }
}