import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, inject, Input, Output} from "@angular/core";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {coercionBoolean} from "../utils/commons";
import {SdIconControl} from "./SdIconControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdIconControl
  ],
  template: `
    <div (click)="onClick()" tabindex="0" (keydown)="onKeydown($event)" [style]="labelStyle">
      <div class="_indicator_rect">
        <div class="_indicator">
          @if (!radio) {
            <sd-icon [icon]="icon"/>
          } @else {
            <div></div>
          }
        </div>
      </div>
      <ng-content/>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    :host {
      > div {
        @include form-control-base();
        color: inherit;
        cursor: pointer;

        display: flex;
        flex-wrap: nowrap;
        flex-direction: row;
        align-items: center;

        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2 + 2px);
        gap: var(--gap-sm);

        > ._indicator_rect {
          display: inline-block;

          width: calc(var(--font-size-default) + 2px);
          height: calc(var(--font-size-default) + 2px);
          border: 1px solid var(--trans-light);
          background: var(--theme-secondary-lightest);
          border-radius: var(--border-radius-sm);

          > ._indicator {
            text-align: center;
            width: 1em;
            line-height: 1em;
            opacity: 0;

            ::ng-deep svg {
              width: 1em;
              vertical-align: top;
            }
          }
        }

        &:focus > ._indicator_rect {
          border-color: var(--theme-primary-default);
        }
      }

      &[sd-radio=true] {
        > div {
          > ._indicator_rect {
            border-radius: 100%;

            > ._indicator {
              border-radius: 100%;
              padding: 3px;
              margin-top: calc(var(--gap-sm) / 2);
              top: 0;
              
              > div {
                border-radius: 100%;
                background: var(--text-trans-default);
                width: 100%;
                height: 100%;
              }
            }
          }
        }
      }

      &[sd-checked=true] {
        > div > ._indicator_rect > ._indicator {
          opacity: 1;
        }
      }

      &[sd-size=sm] > div {
        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2 + 2px);
        padding: var(--gap-xs) var(--gap-sm);
        gap: var(--gap-xs);
      }

      &[sd-size=lg] > div {
        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2 + 2px);
        padding: var(--gap-default) var(--gap-lg);
        gap: var(--gap-default);
      }

      &[sd-inset=true] {
        > div {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2);
          border: none;
          justify-content: center;
        }

        &[sd-size=sm] > div {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2);
        }

        &[sd-size=lg] > div {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2);
        }
      }

      &[sd-inline=true] {
        display: inline-flex;

        > div {
          padding: 0;
          border: none;
          height: auto;
        }
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] > div {
          > ._indicator_rect {
            background: var(--theme-#{$key}-lightest);

            > ._indicator {
              color: var(--theme-#{$key}-default);
            }
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--theme-#{$key}-default);
            }
          }
        }
      }

      &[sd-disabled=true] {
        > div {
          > ._indicator_rect {
            background: var(--theme-grey-lighter);
          }
        }
      }
    }
  `]
})
export class SdCheckboxControl {
  #sdNgOpt = inject(SdAngularOptionsProvider);

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-checked")
  value = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-disabled")
  disabled = false;

  @Output()
  valueChange = new EventEmitter<boolean>();

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inline")
  inline = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-radio")
  radio = false;

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input()
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";

  @Input()
  icon: IconProp = this.#sdNgOpt.icons.check;

  @Input()
  labelStyle?: string;

  onClick(): void {
    if (this.disabled) return;

    if (this.valueChange.observed) {
      this.valueChange.emit(!this.value);
    }
    else {
      this.value = !this.value;
    }
  }

  onKeydown(event: KeyboardEvent): void {
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
