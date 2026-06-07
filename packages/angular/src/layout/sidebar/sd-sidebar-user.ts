import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { SdCollapseIcon } from "../../controls/collapse/sd-collapse-icon";
import { SdCollapse } from "../../controls/collapse/sd-collapse";
import { SdRipple } from "../../core/ripple/sd-ripple";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapseIcon, SdCollapse, SdRipple, SdList, SdListItem, NgIcon],
  host:{
    "[class]": "'pv-lg'"
  },
  template: `
    <div class="p-xs-default">
      <ng-content />
    </div>
    @if (userMenu(); as _userMenu) {
      <div
        class="_menu-button"
        tabindex="0"
        (click)="onMenuOpenButtonClick()"
        (keydown.enter)="onMenuOpenButtonClick()"
        [sdRipple]="true"
      >
        @if (_userMenu.icon) {
          <ng-icon [svg]="_userMenu.icon" />
        }
        {{ _userMenu.title }}
        <sd-collapse-icon [open]="menuOpen()" style="float: right;" [openRotate]="180" />
      </div>

      <sd-collapse [open]="menuOpen()">
        <sd-list [inset]="true">
          @for (menu of _userMenu.menus; track menu.title) {
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
      sd-sidebar-user {
        display: block;

        > ._menu-button {
          display: block;
          cursor: pointer;
          user-select: none;
          color: var(--text-trans-light);

          padding: var(--gap-sm) var(--gap-default);
          border-radius: var(--border-radius-default);
          margin: 0 var(--gap-sm);

          &:hover {
            background: var(--trans-lighter);
          }
        }

        > sd-collapse > ._content > sd-list {
          background: var(--trans-lightest);
          padding: var(--gap-xs) 0;
          margin: 0 var(--gap-sm);
        }
      }
    `,
  ],
})
export class SdSidebarUser {
  userMenu = input<SdSidebarUserMenu>();

  menuOpen = signal(false);

  onMenuOpenButtonClick(): void {
    this.menuOpen.update((v) => !v);
  }
}

export interface SdSidebarUserMenu {
  icon?: string;
  title: string;
  menus: {
    title: string;
    onClick: () => Promise<void> | void;
  }[];
}
