import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button [type]="type" [disabled]="disabled" [attr.style]="safeHtml(buttonStyle)" [attr.class]="safeHtml(buttonClass)">
      <ng-content></ng-content>
    </button>
    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/variables-scss";
    @import "../../../scss/mixins";

    sd-button {
      display: block;
      position: relative;

      > button {
        @include form-control-base();

        font-weight: bold;
        background: white;
        cursor: pointer;
        color: var(--theme-primary-default);
        border-radius: 3px;
        border-color: var(--theme-grey-lighter);

        &:hover {
          background: var(--theme-grey-lightest);
        }

        &:focus {
          outline-color: transparent;
          background: var(--theme-grey-lightest);
        }

        &:active {
          background: var(--theme-grey-lighter);
        }

        &:disabled {
          border-color: var(--theme-grey-lighter);
          cursor: default;
          color: var(--text-color-lighter);
        }
      }

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] > button {
          background: var(--theme-#{$color}-default);
          border-color: var(--theme-#{$color}-default);
          color: var(--text-reverse-color-default);

          &:hover,
          &:focus {
            background: var(--theme-#{$color}-dark);
            border-color: var(--theme-#{$color}-dark);
          }

          &:active {
            background: var(--theme-#{$color}-darker);
            border-color: var(--theme-#{$color}-darker);
          }

          &:disabled {
            background: var(--theme-grey-default);
            border-color: var(--theme-grey-default);
            cursor: default;
          }
        }
      }

      &[sd-size=sm] > button {
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] > button {
        padding: var(--gap-default) var(--gap-lg);
      }

      &[sd-inline=true] {
        display: inline-block;

        > button {
          width: 100%;
        }
      }

      &[sd-invalid=true] > ._invalid-indicator {
        @include invalid-indicator();
      }

      &[sd-inset=true] {
        > button {
          border: none !important;
          box-shadow: none !important;
          border-radius: 0;
          color: var(--theme-primary-default);

          &:hover {
            background: var(--theme-grey-lightest);
          }

          &:active {
            background: var(--theme-grey-lighter);
          }

          &:disabled {
            background: transparent;
          }
        }

        @each $color in $arr-theme-color {
          &[sd-theme=#{$color}] > button {
            background: var(--theme-#{$color}-default);

            &:hover {
              background: var(--theme-#{$color}-dark);
            }

            &:active {
              background: var(--theme-#{$color}-darker);
            }

            &:disabled {
              background: var(--theme-grey-default);
            }
          }
        }
      }
    }
  `]
})
export class SdButtonControl implements AfterContentChecked {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["button", "submit"],
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

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @HostBinding("attr.sd-invalid")
  public isInvalid = false;

  @Input("button.style")
  @SdTypeValidate(String)
  public buttonStyle?: string;

  @Input("button.class")
  @SdTypeValidate(String)
  public buttonClass?: string;

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _sanitization: DomSanitizer) {
  }

  public ngAfterContentChecked(): void {
    this.isInvalid = false;

    if (this.required) {
      if (!((this._elRef.nativeElement as HTMLElement).findAll("> button")[0] as HTMLElement).innerText.trim()) {
        this.isInvalid = true;
      }
    }
  }

  public safeHtml(value?: string): SafeHtml {
    return value ? this._sanitization.bypassSecurityTrustStyle(value) : "";
  }
}
