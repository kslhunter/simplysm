import { Component, signal } from "@angular/core";
import {
  SdTopbarMenuControl,
  type ISdTopbarMenu,
} from "../../../../src/ui/navigation/topbar/sd-topbar-menu.control";

@Component({
  selector: "sd-topbar-menu-unit-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenuControl],
})
export class TopbarMenuUnitTest {
  menus = signal<ISdTopbarMenu[]>([]);
}
