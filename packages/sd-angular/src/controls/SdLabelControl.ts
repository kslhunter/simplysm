import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../commons/SdInputValidate";

/*export function sdLabelColorValidator(value: string): boolean {
  const result = /^#[0-9a-fA-F]*$/.test(value);
  return result;
}*/

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      display: inline-block;
      background: var(--theme-color-grey-darkest);
      color: var(--text-brightness-rev-default);
      padding: 0 var(--gap-xs);
      border-radius: 2px;
      text-indent: 0;

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-color-#{$color}-default);
        }
      }

      &[sd-clickable=true] {
        cursor: pointer;

        &:hover {
          background: var(--theme-color-grey-dark);

          @each $color in $arr-theme-color {
            &[sd-theme=#{$color}] {
              background: var(--theme-color-#{$color}-dark);
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
    includes: ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdInputValidate({
    type: String,
    validator(value: string): boolean {
      return /^#[0-9a-fA-F]*$/.test(value);
    }
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;
}
