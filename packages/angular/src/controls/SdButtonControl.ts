import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../common/SdTypeValidate";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [attr.type]="submit ? 'submit' : undefined">
      <ng-content></ng-content>
    </button>`
})
export class SdButtonControl {
  @Input()
  @SdTypeValidate(Boolean)
  public submit?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["primary", "info", "success", "warning", "danger"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["sm", "lg"].includes(value)
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";
}
