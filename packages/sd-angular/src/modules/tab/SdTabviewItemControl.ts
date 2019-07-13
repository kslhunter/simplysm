import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdTabviewControl} from "./SdTabviewControl";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-tabview-item {
      display: none;
      width: 100%;
      height: 100%;

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
  @SdTypeValidate(String)
  public header?: string;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdTabviewControl))
                     private readonly _parentControl: SdTabviewControl) {
  }
}
