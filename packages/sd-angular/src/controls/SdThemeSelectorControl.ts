import { ChangeDetectionStrategy, Component, inject, viewChild, ViewEncapsulation } from "@angular/core";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdListControl } from "./SdListControl";
import { SdListItemControl } from "./SdListItemControl";
import { SdThemeProvider } from "../providers/SdThemeProvider";
import { SdDropdownPopupControl } from "./SdDropdownPopupControl";
import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { SdLocalStorageProvider } from "../providers/SdLocalStorageProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

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
    FaIconComponent,
  ],
  template: ` <sd-dropdown>
    <sd-anchor style="color: var(--theme-grey-default)">
      <fa-icon [icon]="icons.mountainSun" />
      {{ theme }}
    </sd-anchor>

    <sd-dropdown-popup>
      <sd-list>
        <sd-list-item [selected]="theme === 'compact'" [selectedIcon]="icons.check" (click)="theme = 'compact'">
          compact
        </sd-list-item>
        <sd-list-item [selected]="theme === 'modern'" [selectedIcon]="icons.check" (click)="theme = 'modern'">
          modern
        </sd-list-item>
      </sd-list>
    </sd-dropdown-popup>
  </sd-dropdown>`,
})
export class SdThemeSelectorControl {
  icons = inject(SdAngularOptionsProvider).icons;

  #sdTheme = inject(SdThemeProvider);
  #sdLocalStorage = inject(SdLocalStorageProvider);

  dropdownControl = viewChild.required(SdDropdownControl);

  get theme() {
    return this.#sdTheme.theme;
  }

  set theme(val) {
    this.#sdTheme.theme = val;
    this.dropdownControl().open.set(false);
    this.#sdLocalStorage.set("sd-theme", val);
  }
}
