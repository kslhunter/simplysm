import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdThemes, TSdTheme } from "../commons";

@Component({
  selector: "sd-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      background: white;
      border-radius: var(--border-radius-default);
      overflow: hidden;
      border-top: 3px solid var(--theme-color-primary-default);
      border-bottom: 1px solid var(--theme-color-primary-default);
      border-left: 0 solid var(--theme-color-grey-light);
      border-right: 0 solid var(--theme-color-grey-light);

      &[sd-elevation=none] {
        border-top-width: 0;
        border-bottom-width: 0;
      }

      &[sd-elevation=lg] {
        border-top-width: 5px;
        border-left-width: 1px;
        border-right-width: 1px;
        border-radius: var(--border-radius-xl);
      }

      &[sd-elevation=xl] {
        border-top-width: 7px;
        border-left-width: 1px;
        border-right-width: 1px;
        border-radius: var(--border-radius-xxl);
      }

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          border-color: var(--theme-color-#{$color}-default);
        }
      }
    }
  `]
})
export class SdCardControl {
  @Input()
  @SdInputValidate({ type: String, includes: ["none", "lg", "xl"] })
  @HostBinding("attr.sd-elevation")
  public elevation?: "none" | "lg" | "xl";

  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme = "primary";
}

