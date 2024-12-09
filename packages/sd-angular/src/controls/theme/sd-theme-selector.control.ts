import { ChangeDetectionStrategy, Component, inject, viewChild, ViewEncapsulation } from "@angular/core";
import { SdDropdownControl } from "../dropdown/sd-dropdown.control";
import { SdAnchorControl } from "../button/sd-anchor.control";
import { SdListControl } from "../list/sd-list.control";
import { SdListItemControl } from "../list/sd-list-item.control";
import { SdThemeProvider } from "./sd-theme.provider";
import { SdDropdownPopupControl } from "../dropdown/sd-dropdown-popup.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { $effect } from "../../utils/$hooks";
import { SdIconControl } from "../icon/sd-icon.control";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdAnchorControl,
    SdListControl,
    SdListItemControl,
    SdIconControl,
  ],
  template: `
    <sd-dropdown>
      <sd-anchor style="color: var(--theme-grey-default)">
        <sd-icon [icon]="icons.mountainSun" />
        {{ theme() }}
      </sd-anchor>

      <sd-dropdown-popup>
        <sd-list>
          <sd-list-item [selected]="theme() === 'compact'" [selectedIcon]="icons.check" (click)="theme.set('compact')">
            compact
          </sd-list-item>
          <sd-list-item [selected]="theme() === 'modern'" [selectedIcon]="icons.check" (click)="theme.set('modern')">
            modern
          </sd-list-item>
        </sd-list>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdThemeSelectorControl {
  icons = inject(SdAngularConfigProvider).icons;

  #sdTheme = inject(SdThemeProvider);

  dropdownControl = viewChild.required(SdDropdownControl);

  theme = this.#sdTheme.theme;

  constructor() {
    $effect([this.theme], () => {
      this.dropdownControl().open.set(false);
    });
  }
}
