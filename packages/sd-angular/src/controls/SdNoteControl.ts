import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

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
      padding: var(--gap-default);
      background: var(--theme-grey-lightest);
      border-left: var(--gap-sm) solid var(--trans-default);

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
}
