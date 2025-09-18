import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdListControl } from "../list/SdListControl";
import { SdListItemControl } from "../list/SdListItemControl";
import { SdDropdownControl } from "../dropdown/SdDropdownControl";
import { SdDropdownPopupControl } from "../dropdown/SdDropdownPopupControl";
import { SdButtonControl } from "../SdButtonControl";

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
      <sd-button inline theme="link-grey">
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
