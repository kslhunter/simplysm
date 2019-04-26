import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Input } from "@angular/core";
import { SdTypeValidate } from "../commons/SdTypeValidate";
import { SdTabviewControl } from "./SdTabviewControl";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
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

  public constructor(
    @Inject(forwardRef(() => SdTabviewControl))
    private readonly _parentControl: SdTabviewControl
  ) {}
}
