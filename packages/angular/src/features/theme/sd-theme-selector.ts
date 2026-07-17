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
import { NgIcon } from "@ng-icons/core";
import { SdThemeProvider } from "./sd-theme-provider";
import { tablerMinus, tablerPalette, tablerPlus } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-theme-selector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDropdown, SdDropdownPopup, SdButton, NgIcon],
  template: `
    <sd-dropdown>
      <sd-button [inline]="true" [theme]="'link-gray'">
        <ng-icon [svg]="tablerPalette" />
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
                (click)="_sdTheme.decreaseFontSize()"
              >
                <ng-icon [svg]="tablerMinus" />
              </sd-button>
              <span>{{ _sdTheme.fontSize() }}px</span>
              <sd-button
                [inline]="true"
                [theme]="'link-gray'"
                [size]="'sm'"
                [disabled]="isMaxFontSize()"
                (click)="_sdTheme.increaseFontSize()"
              >
                <ng-icon [svg]="tablerPlus" />
              </sd-button>
            </div>
          </div>
          <div class="flex-row gap-sm cross-align-center">
            <span>테마</span>
            <div class="flex-row gap-xs cross-align-center">
              @for (item of _sdTheme.themes; track item.value) {
                <sd-button
                  [inline]="true"
                  [size]="'sm'"
                  [theme]="_sdTheme.theme() === item.value ? 'primary' : 'link-gray'"
                  (click)="_sdTheme.theme.set(item.value)"
                >
                  {{ item.label }}
                </sd-button>
              }
            </div>
          </div>
        </div>
      </sd-dropdown-popup>
    </sd-dropdown>
  `,
  styles: [],
})
export class SdThemeSelector {
  protected readonly _sdTheme = inject(SdThemeProvider);

  isMinFontSize = computed(() => this._sdTheme.fontSize() <= this._sdTheme.fontSizePresets[0]);

  isMaxFontSize = computed(
    () =>
      this._sdTheme.fontSize() >=
      this._sdTheme.fontSizePresets[this._sdTheme.fontSizePresets.length - 1],
  );

  protected readonly tablerPlus = tablerPlus;
  protected readonly tablerMinus = tablerMinus;
  protected readonly tablerPalette = tablerPalette;
}
