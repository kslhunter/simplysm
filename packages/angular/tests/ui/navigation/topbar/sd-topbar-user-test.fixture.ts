import { Component, signal } from "@angular/core";
import {
  SdTopbarUser,
  type SdTopbarUserMenu,
} from "../../../../src/ui/navigation/topbar/sd-topbar-user";

@Component({
  selector: "sd-topbar-user-basic-test",
  template: `
    <sd-topbar-user [menus]="menus()">홍길동</sd-topbar-user>
  `,
  standalone: true,
  imports: [SdTopbarUser],
})
export class TopbarUserBasicTest {
  menus = signal<SdTopbarUserMenu[]>([
    { title: "프로필", onClick: () => {} },
    { title: "로그아웃", onClick: () => {} },
  ]);
}
