import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {colorValidator} from "../commons/colorValidator";

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
    includes: ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: colorValidator
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;
}
