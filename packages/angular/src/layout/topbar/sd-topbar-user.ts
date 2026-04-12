import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdown } from "../../controls/dropdown/sd-dropdown";
import { SdDropdownPopup } from "../../controls/dropdown/sd-dropdown-popup";
import { SdList } from "../../controls/list/sd-list";
import { SdListItem } from "../../controls/list/sd-list-item";
import { SdButton } from "../../controls/button/sd-button";

@Component({
  selector: "sd-topbar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdown,
    SdDropdownPopup,
    SdList,
    SdListItem,
    SdButton,
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
export class SdTopbarUser {
  menus = input.required<SdTopbarUserMenu[]>();

  private readonly _dropdown = viewChild(SdDropdown);

  onMenuClick(menu: SdTopbarUserMenu): void {
    menu.onClick();
    this._dropdown()?.open.set(false);
  }
}

export interface SdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
