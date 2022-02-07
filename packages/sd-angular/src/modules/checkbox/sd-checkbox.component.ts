import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from "@angular/core";
import { SdInputValidate } from "../../decorators/SdInputValidate";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import fasCheck from "@fortawesome/pro-solid-svg-icons/faCheck";
import { sdThemes, TSdTheme } from "../../commons";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div (click)="onClick()" tabindex="0" (keydown)="onKeydown($event)" [style]="labelStyle">
      <div class="_indicator_rect"></div>
      <fa-icon class="_indicator" [icon]="icon" *ngIf="!radio"></fa-icon>
      <div class="_indicator" *ngIf="radio">
        <div></div>
      </div>
      <div class="_content">
        <ng-content></ng-content>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";
    @import "../../../scss/variables-scss-arr";

    $checkbox-size: calc(var(--font-size-default) * var(--line-height-strip-unit) - var(--gap-sm));

    :host {
      color: var(--text-brightness-default);

      > div {
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

        &:focus {
          outline-color: transparent;

          > ._indicator_rect {
            border-color: var(--theme-color-primary-default);
          }
        }
      }

      &[sd-disabled=true] {
        > div {
          > ._indicator_rect {
            background: var(--theme-color-grey-lighter) !important;
          }

          > ._indicator {
            color: var(--text-brightness-lighter) !important;
          }
        }
      }

      &[sd-checked=true] {
        > div {
          > ._indicator {
            opacity: 1;
          }
        }
      }

      &[sd-radio=true] {
        > div {
          > ._indicator_rect {
            border-radius: 100%;
          }

          > ._indicator {
            padding: 3px;
            margin-top: calc(var(--gap-sm) / 2);
            top: 0;
          }

          > ._indicator > div {
            border-radius: 100%;
            background: var(--text-brightness-default);
            width: 100%;
            height: 100%;
          }
        }
      }

      &[sd-size=sm] > div {
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] > div {
        padding: var(--gap-default) var(--gap-lg);
      }

      &[sd-inset=true] > div {
        border: none;
      }

      &[sd-inline=true] {
        display: inline-block;

        > div {
          padding-left: 0;
        }
      }

      &[sd-inline=text] {
        display: inline-block;

        > div {
          padding-left: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] > div {
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
export class SdCheckboxComponent {
  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-checked")
  public value = false;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
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
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

  @Input()
  public icon: IconProp = fasCheck;

  @Input("label.style")
  @SdInputValidate(String)
  public labelStyle?: string;

  public el: HTMLElement;

  public constructor(private readonly _elRef: ElementRef) {
    this.el = this._elRef.nativeElement as HTMLElement;
  }

  public onClick(): void {
    if (this.disabled) return;

    if (this.valueChange.observers.length > 0) {
      this.valueChange.emit(!this.value);
    }
    else {
      this.value = !this.value;
    }
  }

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
