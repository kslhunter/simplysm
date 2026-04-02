import { Component, signal } from "@angular/core";
import { SdSidebarMenuControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-menu.control";
import type { ISdMenu } from "../../../../src/ui/navigation/menu-utils";

@Component({
  selector: "sd-menu-unit-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class MenuUnitTest {
  menus = signal<ISdMenu[]>([]);
}
