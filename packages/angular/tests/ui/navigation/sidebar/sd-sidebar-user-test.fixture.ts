import { Component, signal } from "@angular/core";
import {
  SdSidebarUser,
  type SdSidebarUserMenu,
} from "../../../../src/ui/navigation/sidebar/sd-sidebar-user";

@Component({
  selector: "sd-sidebar-user-profile-test",
  template: `
    <sd-sidebar-user>
      <div class="profile">User Profile</div>
    </sd-sidebar-user>
  `,
  standalone: true,
  imports: [SdSidebarUser],
})
export class SidebarUserProfileTest {}

@Component({
  selector: "sd-sidebar-user-menu-test",
  template: `<sd-sidebar-user [userMenu]="userMenu()" />`,
  standalone: true,
  imports: [SdSidebarUser],
})
export class SidebarUserMenuTest {
  userMenu = signal<SdSidebarUserMenu>({
    title: "Hong Gildong",
    menus: [
      { title: "Settings", onClick: () => {} },
      { title: "Logout", onClick: () => {} },
    ],
  });
}

@Component({
  selector: "sd-sidebar-user-no-menu-test",
  template: `<sd-sidebar-user />`,
  standalone: true,
  imports: [SdSidebarUser],
})
export class SidebarUserNoMenuTest {}
