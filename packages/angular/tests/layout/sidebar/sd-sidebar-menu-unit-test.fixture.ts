import { Component, signal } from "@angular/core";
import { SdSidebarMenu } from "../../../src/layout/sidebar/sd-sidebar-menu";
import type { SdMenu } from "../../../src/core/routing/menu-utils";

@Component({
  selector: "sd-menu-unit-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenu],
})
export class MenuUnitTest {
  menus = signal<SdMenu[]>([]);
}
