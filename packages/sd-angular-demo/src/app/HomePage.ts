import { ChangeDetectionStrategy, Component } from "@angular/core";
import { faUserCircle } from "@fortawesome/pro-duotone-svg-icons/faUserCircle";

@Component({
  selector: "app-home",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-sidebar-container>
      <sd-sidebar>
        <sd-dock-container>
          <sd-dock>
            <sd-sidebar-brand class="sd-padding-sm-default"
                              [sdRouterLink]="['/home/main']"
                              style="cursor: pointer">
              <h2>심플리즘 데모</h2>
            </sd-sidebar-brand>

            <sd-sidebar-user menuTitle="계정 정보" content.style="text-align: left">
              <div class="sd-padding-top-sm">
                <div style="float:left" class="sd-padding-right-default">
                  <fa-icon [icon]="icons.userCircle" size="3x"></fa-icon>
                </div>

                홍길동<br/>
                <small>심플리즘</small>
              </div>

              <sd-sidebar-user-menu>
                <sd-list class="sd-padding-sm-0">
                  <sd-list-item>
                    <sd-gap [width.px]="6"></sd-gap>
                    로그아웃
                  </sd-list-item>
                </sd-list>
              </sd-sidebar-user-menu>
            </sd-sidebar-user>
          </sd-dock>

          <sd-pane class="sd-padding-sm-0">
            <sd-list>
              <sd-list-item [sdRouterLink]="['/home/sheet2']">
                시트2
              </sd-list-item>
            </sd-list>
          </sd-pane>
        </sd-dock-container>
      </sd-sidebar>

      <sd-pane>
        <router-outlet></router-outlet>
      </sd-pane>
    </sd-sidebar-container>
  `
})
export class HomePage {
  public icons = {
    userCircle: faUserCircle,
  };
}
