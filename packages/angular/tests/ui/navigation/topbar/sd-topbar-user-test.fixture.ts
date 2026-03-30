import { Component, signal } from "@angular/core";
import {
  SdTopbarUserControl,
  type ISdTopbarUserMenu,
} from "../../../../src/ui/navigation/topbar/sd-topbar-user.control";

@Component({
  selector: "sd-topbar-user-basic-test",
  template: `
    <sd-topbar-user [menus]="menus()">홍길동</sd-topbar-user>
  `,
  standalone: true,
  imports: [SdTopbarUserControl],
})
export class TopbarUserBasicTest {
  menus = signal<ISdTopbarUserMenu[]>([
    { title: "프로필", onClick: () => {} },
    { title: "로그아웃", onClick: () => {} },
  ]);
}
