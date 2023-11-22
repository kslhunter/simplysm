import {ChangeDetectionStrategy, Component, inject, ViewChild} from "@angular/core";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdAnchorControl} from "./SdAnchorControl";
import {SdIconControl} from "./SdIconControl";
import {faMountainSun} from "@fortawesome/pro-duotone-svg-icons";
import {SdListControl} from "./SdListControl";
import {SdListItemControl} from "./SdListItemControl";
import {SdThemeProvider} from "../providers/SdThemeProvider";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {faCheck} from "@fortawesome/pro-solid-svg-icons";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdDropdownControl,
    SdDropdownPopupControl,
    SdAnchorControl,
    SdIconControl,
    SdListControl,
    SdListItemControl
  ],
  template: `
    <sd-dropdown>
      <sd-anchor style="color: var(--theme-grey-default)">
        <sd-icon [icon]="faMountainSun"/>
        {{ theme }}
      </sd-anchor>

      <sd-dropdown-popup>
        <sd-list>
          <sd-list-item [selected]="theme === 'compact'"
                        [selectedIcon]="faCheck"
                        (click)="theme = 'compact'">
            compact
          </sd-list-item>
          <sd-list-item [selected]="theme === 'modern'"
                        [selectedIcon]="faCheck"
                        (click)="theme = 'modern'">
            modern
          </sd-list-item>
        </sd-list>
      </sd-dropdown-popup>
    </sd-dropdown>`
})
export class SdThemeSelectorControl {
  #sdTheme = inject(SdThemeProvider);

  @ViewChild(SdDropdownControl, {static: true})
  dropdownControl?: SdDropdownControl;

  get theme() {
    return this.#sdTheme.theme;
  }

  set theme(val) {
    this.#sdTheme.theme = val;
    this.dropdownControl!.open = false;
  }

  protected readonly faMountainSun = faMountainSun;
  protected readonly faCheck = faCheck;
}