import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdCollapseIconControl } from "../sd-collapse-icon.control";
import { SdCollapseControl } from "../sd-collapse.control";
import { SdListControl } from "../sd-list.control";
import { SdListItemControl } from "../sd-list-item.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { $signal } from "../../utils/bindings/$signal";
import { SdRippleDirective } from "../../directives/sd-ripple.directive";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCollapseIconControl, SdCollapseControl, SdListControl, SdListItemControl, SdRippleDirective],
  template: `
    <div class="_content" [style]="contentStyle()" [class]="contentClass()">
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
          <sd-list class="pv-sm" [inset]="true">
            @for (menu of userMenu()?.menus; track menu.title) {
              <sd-list-item (click)="menu.onClick()">
                {{ menu.title }}
              </sd-list-item>
            }
          </sd-list>
        </sd-collapse>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

      sd-sidebar-user {
        display: block;
        padding: var(--gap-xs);

        > ._content {
          background: var(--control-color);
          border-radius: var(--border-radius-default);

          > ._menu-button {
            display: block;
            cursor: pointer;
            user-select: none;

            padding: var(--gap-default);
            border-radius: var(--border-radius-default);
            margin: var(--gap-xxs);

            &:hover {
              background: var(--trans-lighter);
            }
          }

          > sd-collapse > ._content {
            margin: var(--gap-xxs);

            > sd-list {
              background: rgba(0, 0, 0, 0.03);
              border-radius: var(--border-radius-default);
            }
          }
        }
      }
    `,
  ],
})
export class SdSidebarUserControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

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
