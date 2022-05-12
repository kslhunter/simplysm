import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "@simplysm/sd-angular";

@Component({
  selector: "sdm-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../../sd-angular/scss/_variables-scss-arr.scss";
    
    :host {
      display: inline-block;
      color: var(--theme-color-primary-default);

      @include mobile-active-effect(true);

      &[disabled=true] {
        color: var(--theme-color-grey-light);
        pointer-events: none;

        @include mobile-active-effect(false);
      }

      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] {
          color: var(--theme-color-#{$theme}-default);

          &:disabled {
            color: var(--theme-color-grey-light);
          }
        }
      }
    }
  `]
})
export class SdmAnchorControl {
  @HostBinding("attr.tabindex")
  public get tabIndex(): number | undefined {
    return this.disabled === true ? undefined : 0;
  }

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["primary", "secondary", "info", "success", "warning", "danger", "grey"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey";
}
