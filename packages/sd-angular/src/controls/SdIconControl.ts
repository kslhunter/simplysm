import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {IconName} from "@fortawesome/fontawesome-svg-core";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdComponentBase} from "../bases/SdComponentBase";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";

@Component({
  selector: "sd-icon",
  template: `
    <fa-icon *ngIf="icon" [fixedWidth]="fixedWidth" [icon]="[prefix, icon]"></fa-icon>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdComponentBase, useExisting: SdIconControl}]
})
export class SdIconControl extends SdComponentBase {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => Object.values(fas).concat(Object.values(far)).map(item => item.iconName).includes(value),
    notnull: true
  })
  public icon!: IconName;

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["solid", "regular"].includes(value),
    notnull: true
  })
  public type: "solid" | "regular" = "solid";

  @Input()
  @SdTypeValidate(Boolean)
  public fixedWidth?: boolean;

  public get prefix(): string {
    return this.type === "regular" ? "far" : "fas";
  }
}