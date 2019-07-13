import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {IconName} from "@fortawesome/fontawesome-svg-core";
import {sdIconNames} from "../../commons/sdIconNames";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <label tabindex="0" (keydown)="onKeydown($event)">
      <input [checked]="value" (change)="onValueChange($event)" type="checkbox" hidden [disabled]="disabled">
      <div class="_indicator_rect"></div>
      <sd-icon class="_indicator" [icon]="icon" [fw]="true" *ngIf="!radio"></sd-icon>
      <div class="_indicator" *ngIf="radio">
        <div></div>
      </div>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </label>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";
    @import "../../../scss/variables-scss";

    sd-checkbox {
      color: var(--text-color-default);

      > label {
        @include form-control-base();
        color: inherit;
        cursor: pointer;
        position: relative;

        > ._indicator_rect {
          position: absolute;
          display: block;
          width: var(--checkbox-size);
          height: var(--checkbox-size);
          border: 1px solid var(--trans-color-default);
          vertical-align: top;
          transition: border-color .1s linear;
          background: var(--theme-secondary-lightest);
        }

        > ._indicator {
          display: inline-block;
          position: relative;
          opacity: 0;
          transition: opacity .1s linear;
          color: var(--text-color-default);
          width: var(--checkbox-size);
          height: var(--checkbox-size);
          vertical-align: top;
          font-size: var(--font-size-default);
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
          background: var(--theme-grey-lightest) !important;
        }

        &:focus {
          outline-color: transparent;

          > ._indicator_rect {
            border-color: var(--theme-primary-default);
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

      &[sd-radio=true] {
        > label {
          > ._indicator_rect {
            border-radius: 100%;
          }

          > ._indicator {
            padding: var(--gap-xs);
          }

          > ._indicator > div {
            border-radius: 100%;
            background: var(--text-color-default);
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

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] > label {
          > ._indicator_rect {
            background: var(--theme-#{$color}-lightest);
          }

          > ._indicator {
            color: var(--theme-#{$color}-default);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--theme-#{$color}-default);
            }
          }
        }
      }
    }

  `]
})
export class SdCheckboxControl {
  @Input()
  @SdTypeValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-checked")
  public value = false;

  @Input()
  @SdTypeValidate(Boolean)
  public disabled?: boolean;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-radio")
  public radio?: boolean;

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
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    notnull: true,
    includes: sdIconNames
  })
  public icon: IconName = "check";

  public onValueChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.value = el.checked;
    this.valueChange.emit(this.value);
  }

  public onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (event.key === " ") {
      this.value = !this.value;
      this.valueChange.emit(this.value);
    }
  }
}
