import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output
} from "@angular/core";
import { SdInputValidate } from "@simplysm/sd-angular";

@Component({
  selector: "sdm-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div></div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../sd-angular/scss/_variables-scss-arr.scss";
    
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

        background: var(--theme-color-grey-lighter);

        > div {
          display: inline-block;
          width: calc(var(--line-height) - var(--gap-xs));
          height: calc(var(--line-height) - var(--gap-xs));
          border-radius: 100%;

          background: white;

          transition: transform var(--mobile-animation-duration);
        }
      }

      &[sd-on=true] {
        > div {
          background: var(--theme-color-success-default);

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


      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] {
          &[sd-on=true] {
            > div{
              background: var(--theme-color-#{$theme}-default);
            }
          }
        }
      }
      

      &[sd-disabled=true] {
        > div {
          opacity: .5;
          
          > div {
            background: var(--theme-color-grey-default);
          }
        }
      }
    }
  `]
})
export class SdmSwitchControl {
  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
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

    if (this.valueChange.observers.length > 0) {
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
      if (this.valueChange.observers.length > 0) {
        this.valueChange.emit(!this.value);
      }
      else {
        this.value = !this.value;
      }
    }
  }
}
