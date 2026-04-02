import { Component, signal } from "@angular/core";
import { SdTopbarMenuControl } from "../../../../src/ui/navigation/topbar/sd-topbar-menu.control";
import type { ISdMenu } from "../../../../src/ui/navigation/menu-utils";

@Component({
  selector: "sd-topbar-menu-unit-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenuControl],
})
export class TopbarMenuUnitTest {
  menus = signal<ISdMenu[]>([]);
}
