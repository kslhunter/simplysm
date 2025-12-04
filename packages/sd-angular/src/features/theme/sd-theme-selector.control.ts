import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdThemeProvider } from "../../core/providers/sd-theme-provider";
import { SdAngularConfigProvider } from "../../core/providers/app/sd-angular-config.provider";
import { $effect } from "../../core/utils/bindings/$effect";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdDropdownControl } from "../../ui/overlay/dropdown/sd-dropdown.control";
import { SdButtonControl } from "../../ui/form/button/sd-button.control";
import { SdDropdownPopupControl } from "../../ui/overlay/dropdown/sd-dropdown-popup.control";
import { SdListControl } from "../../ui/data/list/sd-list.control";
import { SdListItemControl } from "../../ui/data/list/sd-list-item.control";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    FaIconComponent,
    SdDropdownControl,
    SdButtonControl,
    SdDropdownPopupControl,
    SdListControl,
    SdListItemControl,
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

  private readonly _sdTheme = inject(SdThemeProvider);

  dropdownControl = viewChild.required(SdDropdownControl);

  theme = this._sdTheme.theme;
  dark = this._sdTheme.dark;

  isDev = process.env["NODE_ENV"] === "development";

  constructor() {
    $effect([this.theme], () => {
      this.dropdownControl().open.set(false);
    });
  }
}
