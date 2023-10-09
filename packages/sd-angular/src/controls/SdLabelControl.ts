import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../utils/SdInputValidate";
import {sdThemes, TSdTheme} from "../commons";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      display: inline-block;
      background: var(--theme-grey-darker);
      color: white;
      padding: 0 var(--gap-sm);
      border-radius: var(--border-radius-default);
      text-indent: 0;

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          background: var(--theme-#{$key}-default);
        }
      }

      &[sd-clickable=true] {
        cursor: pointer;

        &:hover {
          background: var(--theme-grey-dark);

          @each $key, $val in map-get($vars, theme) {
            &[sd-theme=#{$key}] {
              background: var(--theme-#{$key}-dark);
            }
          }
        }
      }
    }
  `]
})
export class SdLabelControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

  @Input()
  @SdInputValidate({
    type: String,
    validator(value: string): boolean {
      return (/^#[0-9a-fA-F]*$/).test(value);
    }
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;
}
