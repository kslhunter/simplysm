import { Component, signal } from "@angular/core";
import {
  SdSidebarMenuControl,
  type ISdSidebarMenu,
} from "../../../../src/ui/navigation/sidebar/sd-sidebar-menu.control";

@Component({
  selector: "sd-menu-unit-test",
  template: `<sd-sidebar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdSidebarMenuControl],
})
export class MenuUnitTest {
  menus = signal<ISdSidebarMenu[]>([]);
}
