import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdTypeValidate} from "../common/SdTypeValidate";
import {IconName, library} from "@fortawesome/fontawesome-svg-core";
import {fas} from "@fortawesome/free-solid-svg-icons";
import {far} from "@fortawesome/free-regular-svg-icons";
import {fab} from "@fortawesome/free-brands-svg-icons";
import {SdIconControl} from "./SdIconControl";

library.add(fas, far, fab);

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdSidebarContainerControl {
}

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdSidebarControl {
}

@Component({
  selector: "sd-sidebar-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="_label" [attr.title]="title">
      <sd-icon [icon]="icon"></sd-icon>
    </label>`
})
export class SdSidebarItemControl {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => SdIconControl.iconNames.includes(value)
  })
  public icon?: IconName;

  @Input()
  @SdTypeValidate(String)
  public title?: string;
}
