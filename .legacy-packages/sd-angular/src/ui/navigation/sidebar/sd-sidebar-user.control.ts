import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdCollapseIconControl } from "../collapse/sd-collapse-icon.control";
import { SdCollapseControl } from "../collapse/sd-collapse.control";
import { $signal } from "../../../core/utils/bindings/$signal";
import { SdRippleDirective } from "../../../core/directives/sd-ripple.directive";
import { SdListControl } from "../../data/list/sd-list.control";
import { SdListItemControl } from "../../data/list/sd-list-item.control";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdCollapseIconControl,
    SdCollapseControl,
    SdRippleDirective,
    SdListControl,
    SdListItemControl,
  ],
  template: `
    <div class="p-lg">
      <ng-content></ng-content>
    </div>
    @if (userMenu()?.title) {
      <div class="_menu-button" (click)="onMenuOpenButtonClick()" sd-ripple>
        {{ userMenu()?.title }}
        <sd-collapse-icon [open]="menuOpen()" style="float: right;" [openRotate]="180" />
      </div>
    }

    @if (userMenu()?.title) {
      <sd-collapse [open]="menuOpen()">
        <sd-list [inset]="true">
          @for (menu of userMenu()?.menus; track menu.title) {
            <sd-list-item (click)="menu.onClick()">
              {{ menu.title }}
            </sd-list-item>
          }
        </sd-list>
      </sd-collapse>
    }
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../../scss/commons/mixins";

      sd-sidebar-user {
        display: block;

        > ._menu-button {
          display: block;
          cursor: pointer;
          user-select: none;

          padding: var(--gap-default);

          &:hover {
            background: var(--trans-lighter);
          }
        }

        > sd-collapse > ._content > sd-list {
          background: var(--trans-lightest);
          padding: var(--gap-xs) 0;
        }
      }
    `,
  ],
})
export class SdSidebarUserControl {
  userMenu = input<ISidebarUserMenu>();
  menuTitle = input<string>();

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
