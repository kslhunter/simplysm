import {AfterContentChecked, ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type" [disabled]="disabled">
      <ng-content></ng-content>
    </button>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;

      & > button {
        @include form-control-base();

        background: white;
        cursor: pointer;
        transition: .1s linear;
        color: theme-color(primary, default);
        border-color: get($trans-color, default);

        &:hover {
          background: trans-color(dark);
        }

        &:active {
          transition: none;
          background: trans-color(darker);
        }

        &:disabled {
          background: transparent;
          cursor: default;
          color: text-color(default);
        }
      }

      @each $theme, $colors in $theme-color {
        &[sd-theme=#{$theme}] > button {
          background: get($colors, default);
          border-color: get($colors, default);
          color: text-color(reverse, default);

          &:hover {
            background: get($colors, dark);
            border-color: get($colors, dark);
          }

          &:active {
            background: get($colors, dark);
          }

          &:disabled {
            background: get($theme-color, grey, default);
            border-color: get($theme-color, grey, default);
            cursor: default;
          }
        }
      }

      &[sd-size=sm] > button {
        padding: gap(xs) gap(sm);
      }

      &[sd-size=lg] > button {
        padding: gap(default) gap(lg);
      }

      &[sd-inline=true] {
        display: inline-block;

        > button {
          width: auto;
        }
      }

      &[sd-invalid=true] > ._invalid-indicator {
        display: block;
        position: absolute;
        top: 2px;
        left: 2px;
        border-radius: 100%;
        width: 4px;
        height: 4px;
        background: get($theme-color, danger, default);
      }
    }
  `]
})
export class SdButtonControl implements AfterContentChecked {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["primary", "info", "success", "warning", "danger"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["sm", "lg"].includes(value)
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["button", "submit"].includes(value),
    notnull: true
  })
  public type: "button" | "submit" = "button";

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public required?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @HostBinding("attr.sd-invalid")
  public isInvalid = false;

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }

  public ngAfterContentChecked(): void {
    this.isInvalid = false;

    if (this.required) {
      if (!(this._elRef.nativeElement.findAll("> button")[0] as HTMLElement).innerText.trim()) {
        this.isInvalid = true;
      }
    }
  }
}