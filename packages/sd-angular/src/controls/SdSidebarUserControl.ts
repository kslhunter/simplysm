import {ChangeDetectionStrategy, Component, HostBinding, inject, Input} from "@angular/core";
import useBgJpg from "../../res/user_bg.jpg";
import {NgForOf, NgIf} from "@angular/common";
import {SdCollapseIconControl} from "./SdCollapseIconControl";
import {SdCollapseControl} from "./SdCollapseControl";
import {SdListControl} from "./SdListControl";
import {SdListItemControl} from "./SdListItemControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    NgIf,
    SdCollapseIconControl,
    SdCollapseControl,
    SdListControl,
    SdListItemControl,
    NgForOf
  ],
  template: `
    <div class="_content"
         *ngIf="backgroundImage"
         [style]="'background-image: ' + 'url(' + backgroundImage + '); ' + contentStyle"
         [class]="contentClass">
      <div class="p-lg">
        <ng-content></ng-content>
      </div>
      <div class="_menu-button" *ngIf="userMenu?.title" (click)="onMenuOpenButtonClick()">
        {{ userMenu?.title }}
        <sd-collapse-icon [open]="menuOpen" style="float: right;" openRotate="180"
                          [icon]="icons.angleDown"/>
      </div>
    </div>
    <sd-collapse [open]="menuOpen" *ngIf="userMenu?.title">
      <sd-list class="pv-sm" inset>
        <sd-list-item *ngFor="let menu of userMenu?.menus; trackBy: trackByForMenu;"
                      style="text-indent: 1em"
                      (click)="menu.onClick()">
          {{ menu.title }}
        </sd-list-item>
      </sd-list>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    @import "../scss/mixins";

    :host {
      > ._content {
        body.sd-theme-compact & {
          background-size: cover;
          text-shadow: 0 0 1px var(--text-trans-default);
        }

        body.sd-theme-modern &,
        body.sd-theme-kiosk &,
        body.sd-theme-mobile & {
          background-image: none !important;
        }

        > ._menu-button {
          display: block;
          cursor: pointer;
          user-select: none;

          @include active-effect(true);

          body.sd-theme-compact & {
            padding: var(--gap-sm) var(--gap-default);
            background: var(--trans-default);

            &:hover {
              background: var(--trans-dark);
            }
          }

          body.sd-theme-modern &,
          body.sd-theme-kiosk &,
          body.sd-theme-mobile & {
            padding: var(--gap-sm) var(--gap-default);
            margin: 0 var(--gap-default);
            border-radius: var(--border-radius-default);
            
            &:hover {
              background: var(--trans-lighter);
            }
          }
        }
      }

      body.sd-theme-compact & {
        ::ng-deep > sd-collapse > ._content > sd-list {
          background: var(--trans-default);
        }

        &[sd-menu-open=true] {
          > ._content {
            > ._menu-button {
              background: var(--trans-dark);

              &:active {
                background: var(--trans-darker);
              }
            }
          }
        }
      }
    }
  `]
})
export class SdSidebarUserControl {
  icons = inject(SdAngularOptionsProvider).icons;

  backgroundImage = useBgJpg;

  @Input()
  userMenu?: ISidebarUserMenu;

  @Input()
  menuTitle?: string;

  @HostBinding("attr.sd-menu-open")
  menuOpen = false;

  @Input()
  contentStyle?: string;

  @Input()
  contentClass?: string;

  trackByForMenu = (i: number, item: ISidebarUserMenu["menus"][0]): string => item.title;

  onMenuOpenButtonClick() {
    this.menuOpen = !this.menuOpen;
  }
}

export interface ISidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}