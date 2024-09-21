import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdCollapseIconControl } from "./SdCollapseIconControl";
import { SdCollapseControl } from "./SdCollapseControl";
import { SdListControl } from "./SdListControl";
import { SdListItemControl } from "./SdListItemControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $signal } from "../utils/$hooks";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapseIconControl, SdCollapseControl, SdListControl, SdListItemControl],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-sidebar-user {
        > ._content {
          background-image: none !important;

          > ._menu-button {
            display: block;
            cursor: pointer;
            user-select: none;

            @include active-effect(true);

            padding: var(--gap-default);
            //margin: 0 var(--gap-default);
            margin-left: calc(var(--gap-default) + var(--gap-xxs));
            margin-bottom: var(--gap-xxs);
            border-top-left-radius: var(--border-radius-default);
            border-bottom-left-radius: var(--border-radius-default);

            &:hover {
              background: var(--trans-lighter);
            }
          }
        }

        > sd-collapse > ._content > sd-list {
          background: rgba(0, 0, 0, 0.03);
          padding-left: var(--gap-default);
          margin-left: calc(var(--gap-default) + var(--gap-xxs));
          border-top-left-radius: var(--border-radius-default);
          border-bottom-left-radius: var(--border-radius-default);

          > sd-list-item {
            > ._content {
              margin-right: 0;
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
            }

            > ._child {
              margin-right: 0;
            }
          }
        }
      }
    `
  ],
  template: `
    <div class="_content" [style]="contentStyle()" [class]="contentClass()">
      <div class="p-lg">
        <ng-content></ng-content>
      </div>
      @if (userMenu()?.title) {
        <div class="_menu-button" (click)="onMenuOpenButtonClick()">
          {{ userMenu()?.title }}
          <sd-collapse-icon [open]="menuOpen()" style="float: right;" [openRotate]="180" />
        </div>
      }
    </div>
    @if (userMenu()?.title) {
      <sd-collapse [open]="menuOpen()">
        <sd-list class="pv-sm" [inset]="true">
          @for (menu of userMenu()?.menus; track menu.title) {
            <sd-list-item (click)="menu.onClick()">
              {{ menu.title }}
            </sd-list-item>
          }
        </sd-list>
      </sd-collapse>
    }`,
  host: {
    "[attr.sd-menu-open]": "menuOpen()"
  }
})
export class SdSidebarUserControl {
  icons = inject(SdAngularConfigProvider).icons;

  userMenu = input<ISidebarUserMenu>();
  menuTitle = input<string>();
  contentStyle = input<string>();
  contentClass = input<string>();

  menuOpen = $signal(false);

  onMenuOpenButtonClick() {
    this.menuOpen.update((v) => !v);
  }
}

export interface ISidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}
