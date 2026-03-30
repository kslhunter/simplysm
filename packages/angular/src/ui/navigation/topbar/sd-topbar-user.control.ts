import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownControl } from "../../overlay/dropdown/sd-dropdown.control";
import { SdDropdownPopupControl } from "../../overlay/dropdown/sd-dropdown-popup.control";
import { SdListControl } from "../../data/list/sd-list.control";
import { SdListItemControl } from "../../data/list/sd-list-item.control";
import { SdButtonControl } from "../../form/button/sd-button.control";

@Component({
  selector: "sd-topbar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdListControl,
    SdListItemControl,
    SdButtonControl,
  ],
  template: `
    <sd-dropdown>
      <sd-button [inline]="true" [theme]="'link-gray'">
        <ng-content />
      </sd-button>
      <sd-dropdown-popup>
        <sd-list>
          @for (menu of menus(); track menu.title) {
            <sd-list-item (click)="onMenuClick(menu)">
              {{ menu.title }}
            </sd-list-item>
          }
        </sd-list>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  styles: [],
})
export class SdTopbarUserControl {
  menus = input.required<ISdTopbarUserMenu[]>();

  private readonly _dropdown = viewChild(SdDropdownControl);

  onMenuClick(menu: ISdTopbarUserMenu): void {
    menu.onClick();
    this._dropdown()?.open.set(false);
  }
}

export interface ISdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
