import { ChangeDetectionStrategy, Component, input, signal, ViewEncapsulation } from "@angular/core";
import { SdCollapseIcon } from "../../controls/collapse/sd-collapse-icon";
import { SdCollapse } from "../../controls/collapse/sd-collapse";
import { SdRipple } from "../../core/ripple/sd-ripple";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdCollapseIcon,
    SdCollapse,
    SdRipple,
    SdList,
    SdListItem,
  ],
  template: `
    <div class="p-lg">
      <ng-content />
    </div>
    @if (userMenu()?.title) {
      <div class="_menu-button" tabindex="0" (click)="onMenuOpenButtonClick()" (keydown.enter)="onMenuOpenButtonClick()" [sdRipple]="true">
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
export class SdSidebarUser {
  userMenu = input<SdSidebarUserMenu>();

  menuOpen = signal(false);

  onMenuOpenButtonClick(): void {
    this.menuOpen.update((v) => !v);
  }
}

export interface SdSidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}
