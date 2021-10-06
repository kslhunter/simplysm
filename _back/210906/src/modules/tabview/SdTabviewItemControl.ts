import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Input } from "@angular/core";
import { SdTabviewControl } from "./SdTabviewControl";
import { SdInputValidate } from "../../decorators/SdInputValidate";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";

    :host {
      display: none;
      width: 100%;
      height: 100%;
      overflow: auto;

      &[sd-selected=true] {
        display: block;
      }
    }
  `]
})
export class SdTabviewItemControl {
  @Input()
  public value?: any;

  @Input()
  @SdInputValidate(String)
  public header?: string;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdTabviewControl))
                     private readonly _parentControl: SdTabviewControl) {
  }
}
