import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdTypeValidate} from "../common/SdTypeValidate";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input [attr.type]="type"
           [attr.placeholder]="placeholder"
           [attr.required]="required">`
})
export class SdTextfieldControl {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["text", "password"].includes(value),
    notnull: true
  })
  public type: "text" | "password" = "text";

  @Input()
  @SdTypeValidate(String)
  public placeholder?: string;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;
}
