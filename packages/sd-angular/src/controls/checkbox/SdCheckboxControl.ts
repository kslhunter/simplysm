import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostBinding, Input, Output} from "@angular/core";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {faCheck} from "@fortawesome/pro-solid-svg-icons";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {sdThemes, TSdTheme} from "../../commons";
import {coerceBoolean} from "../../utils/coerceBoolean";

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
    @import "../../scss/variables";
    @import "../../scss/mixins";

    $checkbox-size: calc(var(--font-size-default) * var(--line-height-strip-unit) - var(--gap-sm));

    :host {
      color: var(--text-trans-default);

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
          border: 1px solid var(--trans-light);
          vertical-align: top;
          background: var(--theme-secondary-lightest);
          margin-top: calc(var(--gap-sm) / 2);
          border-radius: var(--border-radius-sm);
        }

        > ._indicator {
          display: inline-block;
          position: relative;
          opacity: 0;
          color: var(--text-trans-default);
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
            border-color: var(--theme-primary-default);
          }
        }
      }

      &[sd-disabled=true] {
        > div {
          > ._indicator_rect {
            background: var(--theme-grey-lighter) !important;
          }

          > ._indicator {
            color: var(--text-trans-lighter) !important;
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
            background: var(--text-trans-default);
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
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] > div {
          > ._indicator_rect {
            background: var(--theme-#{$key}-lightest);
          }

          > ._indicator {
            color: var(--theme-#{$key}-default);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--theme-#{$key}-default);
            }
          }
        }
      }
    }

  `]
})
export class SdCheckboxControl {
  @Input()
  @SdInputValidate({type: Boolean, notnull: true})
  @HostBinding("attr.sd-checked")
  public value = false;

  @Input({transform: coerceBoolean})
  @HostBinding("attr.sd-disabled")
  public disabled = false;

  @Output()
  public readonly valueChange = new EventEmitter<boolean>();

  @Input({transform: coerceBoolean})
  @HostBinding("attr.sd-inline")
  public inline = false;

  @Input({transform: coerceBoolean})
  @HostBinding("attr.sd-inset")
  public inset = false;

  @Input({transform: coerceBoolean})
  @HostBinding("attr.sd-radio")
  public radio = false;

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
  public icon: IconProp = faCheck;

  @Input()
  @SdInputValidate(String)
  public labelStyle?: string;

  public el: HTMLElement;

  public constructor(private readonly _elRef: ElementRef) {
    this.el = this._elRef.nativeElement as HTMLElement;
  }

  public onClick(): void {
    if (this.disabled) return;

    if (this.valueChange.observed) {
      this.valueChange.emit(!this.value);
    }
    else {
      this.value = !this.value;
    }
  }

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
