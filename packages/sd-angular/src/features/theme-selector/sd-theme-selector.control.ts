import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownControl } from "../../controls/overlay/dropdown/sd-dropdown.control";
import { SdListControl } from "../../controls/list/sd-list.control";
import { SdListItemControl } from "../../controls/list/sd-list-item.control";
import { SdThemeProvider } from "../../core/providers/sd-theme-provider";
import { SdDropdownPopupControl } from "../../controls/overlay/dropdown/sd-dropdown-popup.control";
import { SdAngularConfigProvider } from "../../core/providers/sd-angular-config.provider";
import { $effect } from "../../core/utils/bindings/$effect";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdButtonControl } from "../../controls/form/button/sd-button.control";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdListControl,
    SdListItemControl,
    FaIconComponent,
    SdButtonControl,
  ],
  template: `
    <sd-dropdown>
      <sd-button [theme]="'link-gray'">
        <fa-icon [icon]="icons.mountainSun" />
        <span>{{ theme() }}</span>
        @if (dark()) {
          <span>-dark</span>
        }
      </sd-button>

      <sd-dropdown-popup>
        <sd-list>
          <sd-list-item
            [selected]="theme() === 'compact' && !dark()"
            [selectedIcon]="icons.check"
            (click)="theme.set('compact'); dark.set(false)"
          >
            compact
          </sd-list-item>
          <sd-list-item
            [selected]="theme() === 'compact' && dark()"
            [selectedIcon]="icons.check"
            (click)="theme.set('compact'); dark.set(true)"
          >
            compact-dark
          </sd-list-item>
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
