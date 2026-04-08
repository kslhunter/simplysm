import { Component, signal } from "@angular/core";
import { SdSidebarMenu } from "../../../../src/ui/navigation/sidebar/sd-sidebar-menu";
import type { SdMenu } from "../../../../src/ui/navigation/menu-utils";

@Component({
  selector: "sd-menu-unit-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class MenuUnitTest {
  menus = signal<SdMenu[]>([]);
}
