import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdListControl } from "../../list/sd-list.control";
import { SdListItemControl } from "../../list/sd-list-item.control";
import { SdDropdownControl } from "../../overlay/dropdown/sd-dropdown.control";
import { SdDropdownPopupControl } from "../../overlay/dropdown/sd-dropdown-popup.control";
import { SdButtonControl } from "../../form/button/sd-button.control";

@Component({
  selector: "sd-topbar-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdListControl,
    SdListItemControl,
    SdDropdownControl,
    SdDropdownPopupControl,
    SdButtonControl,
  ],
  template: `
    <sd-dropdown #dropdownEl>
      <sd-button [inline]="true" [theme]="'link-gray'">
        <ng-content />
      </sd-button>

      <sd-dropdown-popup>
        <sd-list>
          @for (menu of menus(); track menu.title) {
            <sd-list-item (click)="menu.onClick(); dropdownEl.open.set(false)">
              {{ menu.title }}
            </sd-list-item>
          }
        </sd-list>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdTopbarUserControl {
  menus = input.required<
    {
      title: string;
      onClick: () => void;
    }[]
  >();
}
