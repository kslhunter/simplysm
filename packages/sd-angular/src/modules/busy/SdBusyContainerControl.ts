import {ChangeDetectionStrategy, Component, HostBinding, HostListener, Input} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdBusyContainerProvider} from "./SdBusyContainerProvider";

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

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["spinner", "bar"]
  })
  @HostBinding("attr.sd-type")
  public type: "spinner" | "bar";

  @Input("no-fade")
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-no-fade")
  public noFade?: boolean;

  public constructor(private readonly _prov: SdBusyContainerProvider) {
    this.type = this._prov.type || "spinner";
    this.noFade = this._prov.noFade;
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
