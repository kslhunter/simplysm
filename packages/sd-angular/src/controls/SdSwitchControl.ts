import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output
} from "@angular/core";
import {SdInputValidate} from "@simplysm/sd-angular";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule
  ],
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
  @Input()
  @SdInputValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-on")
  public value = false;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate({
    type: [Boolean, String],
    includes: [true, false, "text"]
  })
  @HostBinding("attr.sd-inline")
  public inline?: boolean | "text";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["primary", "secondary", "info", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "warning" | "danger";

  @HostBinding("attr.tabindex")
  public tabindex = 0;

  @HostListener("click", ["$event"])
  public onClick(): void {
    if (this.disabled) return;

    if (this.valueChange.observed) {
      this.valueChange.emit(!this.value);
    }
    else {
      this.value = !this.value;
    }
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
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
