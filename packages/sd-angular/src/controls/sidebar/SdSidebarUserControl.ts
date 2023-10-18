import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {faChevronDown} from "@fortawesome/pro-light-svg-icons/faChevronDown";
import useBgJpg from "../../../res/user_bg.jpg";

@Component({
  selector: "sd-sidebar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
                          [icon]="icons.falChevronDown"></sd-collapse-icon>
      </div>
    </div>
    <sd-collapse [open]="menuOpen" *ngIf="userMenu?.title">
      <sd-list class="bg-trans-default pv-sm" inset>
        <sd-list-item *ngFor="let menu of userMenu?.menus; trackBy: menuTrackBy;"
                      style="text-indent: 1em"
                      (click)="menu.onClick()">
          {{menu.title}}
        </sd-list-item>
      </sd-list>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    
    :host {
      > ._content {
        background-size: cover;
        text-shadow: 0 0 1px var(--text-trans-default);
        text-align: center;

        > ._menu-button {
          display: block;
          text-align: left;
          padding: var(--gap-sm) var(--gap-default);
          background: var(--trans-default);
          cursor: pointer;
          user-select: none;

          @media all and (pointer: coarse) {
            @include active-effect(true);
          }

          &:hover {
            background: var(--trans-dark);
          }

          &:active {
            background: var(--trans-darker);
          }
        }
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
  `]
})
export class SdSidebarUserControl {
  public icons = {
    falChevronDown: faChevronDown
  };

  public backgroundImage = useBgJpg;

  @Input()
  public userMenu?: ISidebarUserMenu;

  @Input()
  @SdInputValidate(String)
  public menuTitle?: string;

  @HostBinding("attr.sd-menu-open")
  public menuOpen?: boolean;

  @Input()
  @SdInputValidate(String)
  public contentStyle?: string;

  @Input()
  @SdInputValidate(String)
  public contentClass?: string;

  public menuTrackBy = (i: number, item: ISidebarUserMenu["menus"][0]): string => item.title;

  public onMenuOpenButtonClick(): void {
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