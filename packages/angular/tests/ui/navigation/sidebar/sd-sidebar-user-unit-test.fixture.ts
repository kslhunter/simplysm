import { Component, signal } from "@angular/core";
import {
  SdSidebarUserControl,
  type ISidebarUserMenu,
} from "../../../../src/ui/navigation/sidebar/sd-sidebar-user.control";

@Component({
  selector: "sd-user-unit-test",
  template: `
    <sd-sidebar-user [userMenu]="userMenu()">
      <div class="profile-content">Profile</div>
    </sd-sidebar-user>
  `,
  standalone: true,
  imports: [SdSidebarUserControl],
})
export class UserUnitTest {
  userMenu = signal<ISidebarUserMenu | undefined>(undefined);
}
