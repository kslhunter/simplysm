import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdownControl } from "./sd-dropdown.control";
import { SdAnchorControl } from "./sd-anchor.control";
import { SdListControl } from "./sd-list.control";
import { SdListItemControl } from "./sd-list-item.control";
import { SdThemeProvider } from "../providers/sd-theme.provider";
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";
import { $effect } from "../utils/bindings/$effect";
import { SdTablerIconControl } from "./tabler-icon/sd-tabler-icon.control";
import { taColorSwatch } from "@simplysm/sd-tabler-icons/icons/ta-color-swatch";
import { taCheck } from "@simplysm/sd-tabler-icons/icons/ta-check";

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
    SdTablerIconControl,
  ],
  template: `
    <sd-dropdown>
      <sd-anchor style="color: var(--theme-grey-default)">
        <sd-tabler-icon [icon]="taColorSwatch" />
        {{ theme() }}
      </sd-anchor>

      <sd-dropdown-popup>
        <sd-list>
          <sd-list-item
            [selected]="theme() === 'compact' && !dark()"
            [selectedIcon]="taCheck"
            (click)="theme.set('compact'); dark.set(false)"
          >
            compact
          </sd-list-item>
          @if (isDev) {
            <sd-list-item
              [selected]="theme() === 'compact' && dark()"
              [selectedIcon]="taCheck"
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

  protected readonly taColorSwatch = taColorSwatch;
  protected readonly taCheck = taCheck;
}
