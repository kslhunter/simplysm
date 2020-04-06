import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      padding: var(--gap-default);
      background: var(--theme-color-grey-lightest);
      border-left: var(--gap-sm) solid var(--trans-brightness-default);

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-color-#{$color}-lightest);
          border-color: var(--theme-color-#{$color}-lighter);
        }
      }

      &[sd-size=sm] {
        font-size: var(--font-size-sm);
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] {
        padding: var(--gap-default) var(--gap-lg);
      }
    }
  `]
})
export class SdNoteControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["primary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";
}
