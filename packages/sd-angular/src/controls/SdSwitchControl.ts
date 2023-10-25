import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output
} from "@angular/core";
import {coercionBoolean} from "@simplysm/sd-angular";

@Component({
  selector: "sd-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <div>
      <div></div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      display: block;
      padding: var(--gap-sm) 0;
      border: 1px solid transparent;

      > div {
        height: var(--line-height);
        width: calc(var(--line-height) * 2 - var(--gap-xs));
        padding: calc(var(--gap-xs) / 2);
        border-radius: calc(var(--line-height) / 2);
        text-align: left;

        background: var(--theme-grey-lighter);

        > div {
          display: inline-block;
          width: calc(var(--line-height) - var(--gap-xs));
          height: calc(var(--line-height) - var(--gap-xs));
          border-radius: 100%;

          background: white;

          transition: transform var(--animation-duration);
        }
      }

      &[sd-on=true] {
        > div {
          background: var(--theme-success-default);

          > div {
            transform: translateX(100%);
          }
        }
      }

      &[sd-inline=true] {
        display: inline-block;
      }

      &[sd-inset=true] {
        border: none;
      }

      &[sd-size=sm] {
        padding: var(--gap-sm) 0;
      }

      &[sd-size=lg] {
        font-size: var(--font-size-lg);
        padding: var(--gap-default) 0;
      }


      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          &[sd-on=true] {
            > div {
              background: var(--theme-#{$key}-default);
            }
          }
        }
      }


      &[sd-disabled=true] {
        > div {
          opacity: .5;

          > div {
            background: var(--theme-grey-default);
          }
        }
      }
    }
  `]
})
export class SdSwitchControl {
  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-on")
  value = false;

  @Output()
  valueChange = new EventEmitter<boolean>();

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inline")
  inline = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input()
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";

  @HostBinding("attr.tabindex")
  tabindex = 0;

  @HostListener("click", ["$event"])
  onClick() {
    if (this.disabled) return;

    if (this.valueChange.observed) {
      this.valueChange.emit(!this.value);
    }
    else {
      this.value = !this.value;
    }
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;

    if (event.key === " ") {
      if (this.valueChange.observed) {
        this.valueChange.emit(!this.value);
      }
      else {
        this.value = !this.value;
      }
    }
  }
}
