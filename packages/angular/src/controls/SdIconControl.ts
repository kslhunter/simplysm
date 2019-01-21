import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdTypeValidate} from "../common/SdTypeValidate";
import {IconName, library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fab} from "@fortawesome/free-brands-svg-icons";

library.add(fas, far, fab);

@Component({
  selector: "sd-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fa-icon [icon]="[type === 'solid' ? 'fas' : type === 'regular' ? 'far' : 'fab', icon]"
             [fixedWidth]="fw"></fa-icon>`
})
export class SdIconControl {
  public static iconNames: IconName[] =
    Object.values(fas).concat(Object.values(far)).concat(Object.values(fab)).map(item => item.iconName).distinct();

  @Input()
  @SdTypeValidate({
    type: String,
    validator: (value: IconName) => SdIconControl.iconNames.includes(value)
  })
  public icon?: IconName;

  @Input()
  public fw?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["solid", "regular", "brands"].includes(value),
    notnull: true
  })
  public type = "solid";
}
