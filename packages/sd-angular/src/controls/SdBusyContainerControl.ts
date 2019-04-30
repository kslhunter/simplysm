import {ChangeDetectionStrategy, Component, HostBinding, HostListener, Input} from "@angular/core";
import {SdTypeValidate} from "../commons/SdTypeValidate";

@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_screen">
      <div class="_rect">
        <div class="_indicator"></div>
      </div>
    </div>
    <ng-content></ng-content>`
})
export class SdBusyContainerControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-busy")
  public busy?: boolean;

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
