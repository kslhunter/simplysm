import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdNoteControl {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["primary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";
}
