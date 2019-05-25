import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {IconName, SizeProp} from "@fortawesome/fontawesome-svg-core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
// import {sdIconNames} from "../commons/icons";


@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fa-icon [icon]="iconArr" [fixedWidth]="fw" [size]="size" *ngIf="icon"></fa-icon>`
})
export class SdIconControl {
  @Input()
  @SdTypeValidate({
    type: String/*,
    includes: sdIconNames*/
  })
  public icon?: IconName;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-fw")
  public fw?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["solid", "regular", "brands"],
    notnull: true
  })
  public type = "solid";

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["xs", "lg", "sm", "1x", "2x", "3x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"]
  })
  public size?: SizeProp;

  public get iconArr(): string[] | undefined {
    return this.icon ? [
      this.type === "brands" ? "fab" : this.type === "regular" ? "far" : "fas",
      this.icon
    ] : undefined;
  }
}
