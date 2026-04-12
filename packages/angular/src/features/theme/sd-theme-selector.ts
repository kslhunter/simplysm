import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { SdDropdown } from "../../controls/dropdown/sd-dropdown";
import { SdDropdownPopup } from "../../controls/dropdown/sd-dropdown-popup";
import { SdButton } from "../../controls/button/sd-button";
import { SdSwitch } from "../../controls/checkbox/sd-switch";
import { NgIcon } from "@ng-icons/core";
import { tablerMinus, tablerPalette, tablerPlus } from "@ng-icons/tabler-icons";
import { SdThemeProvider } from "./sd-theme-provider";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup, SdButton, SdSwitch, NgIcon],
  template: `
    <sd-dropdown>
      <sd-button [inline]="true" [theme]="'link-gray'">
        <ng-icon [svg]="icons.tablerPalette" />
      </sd-button>
      <sd-dropdown-popup>
        <div class="p-default">
          <div class="flex-row gap-sm cross-align-center">
            <span>글자 크기</span>
            <div class="flex-row gap-xs cross-align-center">
              <sd-button
                [inline]="true"
                [theme]="'link-gray'"
                [size]="'sm'"
                [disabled]="isMinFontSize()"
                (click)="sdTheme.decreaseFontSize()"
              >
                <ng-icon [svg]="icons.tablerMinus" />
              </sd-button>
              <span>{{ sdTheme.fontSize() }}px</span>
              <sd-button
                [inline]="true"
                [theme]="'link-gray'"
                [size]="'sm'"
                [disabled]="isMaxFontSize()"
                (click)="sdTheme.increaseFontSize()"
              >
                <ng-icon [svg]="icons.tablerPlus" />
              </sd-button>
            </div>
          </div>
          <div class="flex-row gap-sm cross-align-center">
            <span>다크 모드</span>
            <sd-switch [(value)]="sdTheme.dark" />
          </div>
        </div>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  styles: [],
})
export class SdThemeSelector {
  protected readonly icons = { tablerPalette, tablerMinus, tablerPlus };
  protected readonly sdTheme = inject(SdThemeProvider);

  protected readonly isMinFontSize = computed(
    () => this.sdTheme.fontSize() <= this.sdTheme.fontSizePresets[0],
  );

  protected readonly isMaxFontSize = computed(
    () =>
      this.sdTheme.fontSize() >= this.sdTheme.fontSizePresets[this.sdTheme.fontSizePresets.length - 1],
  );
}
