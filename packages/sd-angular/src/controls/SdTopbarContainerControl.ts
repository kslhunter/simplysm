import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdTypeValidate } from "../commons/SdTypeValidate";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
})
export class SdTopbarContainerControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-hide-topbar")
  public hideTopbar?: boolean;
}
