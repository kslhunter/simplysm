import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      display: block;
      padding: var(--gap-sm) var(--gap-default);
      background: var(--theme-grey-lightest);

      body.sd-theme-compact & {
        border-left: var(--gap-sm) solid var(--trans-default);
      }

      body.sd-theme-modern &,
      body.sd-theme-mobile &,
      body.sd-theme-kiosk & {
        border: none;
        border-radius: var(--border-radius-default);
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          background: var(--theme-#{$key}-lightest);
          border-color: var(--theme-#{$key}-light);
        }
      }

      &[sd-size=sm] {
        font-size: var(--font-size-sm);
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] {
        padding: var(--gap-default) var(--gap-lg);
      }

      &[sd-inset=true] {
        body.sd-theme-compact &,
        body.sd-theme-modern &,
        body.sd-theme-mobile &,
        body.sd-theme-kiosk & {
          border-radius: 0;
        }
      }
    }
  `]
})
export class SdNoteControl {
  @Input()
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;
}
