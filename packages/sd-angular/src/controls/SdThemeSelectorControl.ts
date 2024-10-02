import { ChangeDetectionStrategy, Component, inject, viewChild, ViewEncapsulation } from "@angular/core";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdListControl } from "./SdListControl";
import { SdListItemControl } from "./SdListItemControl";
import { SdThemeProvider } from "../providers/SdThemeProvider";
import { SdDropdownPopupControl } from "./SdDropdownPopupControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { $effect } from "../utils/$hooks";

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
  template: `
    <sd-dropdown>
      <sd-anchor style="color: var(--theme-grey-default)">
        <fa-icon [icon]="icons.mountainSun" />
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
