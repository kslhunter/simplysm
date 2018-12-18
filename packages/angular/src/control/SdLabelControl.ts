import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";


@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdLabelControl {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => /^#[0-9a-fA-F]*$/.test(value)
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;
}