import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import { IconName } from "@fortawesome/fontawesome-svg-core";
import { sdIconNames } from "../commons/sdIconNames";
import { SdInputValidate } from "../commons/SdInputValidate";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label tabindex="0" (keydown)="onKeydown($event)">
      <input [checked]="value"
             (change)="onValueChange($event)"
             [type]="radio ? 'radio' : 'checkbox'" hidden
             [disabled]="disabled">
      <div class="_indicator_rect"></div>
      <sd-icon class="_indicator" [icon]="icon" *ngIf="!radio"></sd-icon>
      <div class="_indicator" *ngIf="radio">
        <div></div>
      </div>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    $checkbox-size: calc(var(--font-size-default) * var(--line-height-strip-unit) - var(--gap-sm));

    :host {
      color: var(--text-brightness-default);

      > label {
        @include form-control-base();
        color: inherit;
        cursor: pointer;
        position: relative;
        border-color: transparent;

        > ._indicator_rect {
          position: absolute;
          display: inline-block;
          width: $checkbox-size;
          height: $checkbox-size;
          border: 1px solid var(--trans-brightness-default);
          vertical-align: top;
          background: var(--theme-color-secondary-lightest);
          margin-top: calc(var(--gap-sm) / 2);
        }

        > ._indicator {
          display: inline-block;
          position: relative;
          opacity: 0;
          color: var(--text-brightness-default);
          width: $checkbox-size;
          height: $checkbox-size;
          vertical-align: top;
          font-size: var(--font-size-default);
          top: -1px;
          text-indent: 1px;
        }

        > ._content {
          display: inline-block;
          vertical-align: top;
          text-indent: var(--gap-sm);

          > * {
            text-indent: 0;
          }
        }

        > input:disabled + ._indicator_rect {
          background: var(--theme-color-grey-lightest) !important;
        }

        > input:disabled + ._indicator_rect + ._indicator {
          color: var(--text-brightness-lighter) !important;
        }

        &:focus {
          outline-color: transparent;

          > ._indicator_rect {
            border-color: var(--theme-color-primary-default);
          }
        }
      }

      &[sd-checked=true] {
        > label {
          > ._indicator {
            opacity: 1;
          }
        }
      }

      &[sd-inline=true] {
        display: inline-block;

        > label {
          padding-left: 0;
        }
      }

      &[sd-inline=text] {
        display: inline-block;

        > label {
          padding-left: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      &[sd-radio=true] {
        > label {
          > ._indicator_rect {
            border-radius: 100%;
          }

          > ._indicator {
            padding: 3px;
            margin-top: calc(var(--gap-sm) / 2);
          }

          > ._indicator > div {
            border-radius: 100%;
            background: var(--text-brightness-default);
            width: 100%;
            height: 100%;
          }
        }
      }

      &[sd-size=sm] > label {
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] > label {
        padding: var(--gap-default) var(--gap-lg);
      }

      &[sd-inset=true] > label {
        border: none;
      }

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] > label {
          > ._indicator_rect {
            background: var(--theme-color-#{$color}-lightest);
          }

          > ._indicator {
            color: var(--theme-color-#{$color}-default);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--theme-color-#{$color}-default);
            }
          }
        }
      }
    }

  `]
})
export class SdCheckboxControl {
  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-checked")
  public value = false;

  @Input()
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

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
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-radio")
  public radio?: boolean;

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
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: sdIconNames
  })
  public icon: IconName = "check";

  public el: HTMLElement;

  public constructor(private readonly _elRef: ElementRef) {
    this.el = this._elRef.nativeElement as HTMLElement;
  }

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (!this.el.hasAttribute("ng-reflect-value")) {
      this.value = el.checked;
    }
    this.valueChange.emit(el.checked);
  }

  public onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (event.key === " ") {
      const el = event.target as HTMLInputElement;
      if (!el.hasAttribute("ng-reflect-value")) {
        this.value = !this.value;
      }
      this.valueChange.emit(this.value);
    }
  }
}
