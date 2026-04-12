import { Component, signal } from "@angular/core";
import {
  SdSidebarUser,
  type SdSidebarUserMenu,
} from "../../../src/layout/sidebar/sd-sidebar-user";

@Component({
  selector: "sd-user-unit-test",
  template: `
    <sd-sidebar-user [userMenu]="userMenu()">
      <div class="profile-content">Profile</div>
    </sd-sidebar-user>
  `,
  standalone: true,
  imports: [SdSidebarUser],
})
export class UserUnitTest {
  userMenu = signal<SdSidebarUserMenu | undefined>(undefined);
}
