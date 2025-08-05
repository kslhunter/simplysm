import { ChangeDetectionStrategy, Component, inject, viewChild, ViewEncapsulation } from "@angular/core";
import { SdDropdownControl } from "./dropdown/sd-dropdown.control";
import { SdListControl } from "./list/sd-list.control";
import { SdListItemControl } from "./list/sd-list-item.control";
import { SdThemeProvider } from "../providers/sd-theme.provider";
import { SdDropdownPopupControl } from "./dropdown/sd-dropdown-popup.control";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $effect } from "../utils/bindings/$effect";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDropdownControl, SdDropdownPopupControl, SdListControl, SdListItemControl, FaIconComponent],
  template: `
    <sd-dropdown>
      <a style="color: var(--theme-grey-default)">
        <fa-icon [icon]="icons.mountainSun" />
        {{ theme() }}
      </a>

      <sd-dropdown-popup>
        <sd-list>
          <sd-list-item
            [selected]="theme() === 'compact' && !dark()"
            [selectedIcon]="icons.check"
            (click)="theme.set('compact'); dark.set(false)"
          >
            compact
          </sd-list-item>
          @if (isDev) {
            <sd-list-item
              [selected]="theme() === 'compact' && dark()"
              [selectedIcon]="icons.check"
              (click)="theme.set('compact'); dark.set(true)"
            >
              compact-dark
            </sd-list-item>
          }
        </sd-list>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
})
export class SdThemeSelectorControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdTheme = inject(SdThemeProvider);

  dropdownControl = viewChild.required(SdDropdownControl);

  theme = this.#sdTheme.theme;
  dark = this.#sdTheme.dark;

  isDev = process.env["NODE_ENV"] === "development";

  constructor() {
    $effect([this.theme], () => {
      this.dropdownControl().open.set(false);
    });
  }
}
