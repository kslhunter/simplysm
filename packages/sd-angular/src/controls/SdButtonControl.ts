import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {PropertyValidate} from "@simplysm/sd-core-common";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "role": "button",
    "tabindex": "0"
  },
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      display: block;
      padding: var(--gap-default);
      text-align: center;
      background: white;
      border: 1px solid var(--sd-border-color);
      cursor: pointer;
      border-radius: 2px;

      &:hover {
        background: var(--theme-color-grey-lightest);
      }

      &:active {
        background: var(--theme-color-grey-lighter);
      }


      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] {
          background: var(--theme-color-#{$theme}-default);
          color: var(--text-brightness-rev-default);


          &:hover {
            background: var(--theme-color-#{$theme}-dark);
          }

          &:active {
            background: var(--theme-color-#{$theme}-darker);
          }
        }
      }
    }
  `]
})
export class SdButtonControl {
  @Input()
  @PropertyValidate({
    type: String,
    includes: ["primary", /*"secondary", */"info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";
}
