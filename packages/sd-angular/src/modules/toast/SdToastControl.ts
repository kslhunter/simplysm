import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_sd-toast-block">
      <div class="_sd-toast-message">
        <ng-content></ng-content>
      </div>
    </div>`
})
export class SdToastControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  public close = new EventEmitter<any>();

  @Input()
  @SdTypeValidate({
    type: String,
    notnull: true,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" = "info";
}
