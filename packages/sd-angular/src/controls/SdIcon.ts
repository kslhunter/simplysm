import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from "@angular/core";
import {IconName} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {SimgularHelpers} from "../helpers/SimgularHelpers";

@Component({
  selector: "sd-icon",
  template: `
        <fa-icon *ngIf="icon" [fixedWidth]="fixedWidth" [icon]="[faPrefix, icon]"></fa-icon>
        <div *ngIf="!icon && fixedWidth" style="display: inline-block; width: 15px;"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SdIconControl implements OnChanges {
  @Input() public icon?: IconName;
  @Input() public type?: "solid" | "regular" = "solid";
  @Input() public fixedWidth?: boolean;

  public get faPrefix(): string {
    return this.type === "regular" ? "far" : "fas";
  }

  public ngOnChanges(changes: SimpleChanges): void {
    SimgularHelpers.typeValidate(changes, {
      icon: {
        type: String,
        validator: value => Object.values(fas).map(item => item.iconName).includes(value)
      },
      prefix: {
        type: String,
        validator: value => ["solid", "regular"].includes(value)
      },
      fixedWidth: {
        type: Boolean
      }
    });
  }
}
