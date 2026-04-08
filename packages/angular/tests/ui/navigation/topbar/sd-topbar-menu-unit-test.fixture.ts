import { Component, signal } from "@angular/core";
import { SdTopbarMenu } from "../../../../src/ui/navigation/topbar/sd-topbar-menu";
import type { SdMenu } from "../../../../src/ui/navigation/menu-utils";

@Component({
  selector: "sd-topbar-menu-unit-test",
  template: `<sd-topbar-menu [menus]="menus()" />`,
  standalone: true,
  imports: [SdTopbarMenu],
})
export class TopbarMenuUnitTest {
  menus = signal<SdMenu[]>([]);
}
