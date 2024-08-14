import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewEncapsulation
} from "@angular/core";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {coercionBoolean} from "../utils/commons";
import {SdIconControl} from "./SdIconControl";
import {SdAngularOptionsProvider} from "../providers/SdAngularOptionsProvider";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
      <div class="_contents">
        <ng-content/>        
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    sd-checkbox {
      > div {
        @include form-control-base();
        color: inherit;
        cursor: pointer;

        //display: flex;
        //flex-wrap: nowrap;
        //flex-direction: row;

        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2 + 2px);
        gap: var(--gap-sm);

        > ._indicator_rect {
          display: inline-block;
          vertical-align: calc((1em - var(--line-height)) / 2);

          width: calc(var(--font-size-default) + 2px);
          height: calc(var(--font-size-default) + 2px);
          border: 1px solid var(--trans-light);
          background: var(--theme-secondary-lightest);
          border-radius: var(--border-radius-xs);

          > ._indicator {
            text-align: center;
            opacity: 0;
            color: white;

            > sd-icon > svg {
              vertical-align: top;
            }
          }
        }

        ._contents {
          display: inline-block;
          vertical-align: top;
          padding-left: var(--gap-sm);
        }

        > ._indicator_rect + ._contents:empty {
          display: none;
        }

        &:focus > ._indicator_rect {
          border-color: var(--theme-primary-dark);
        }
      }

      &[sd-radio=true] {
        > div {
          > ._indicator_rect {
            border-radius: 100%;

            > ._indicator {
              border-radius: 100%;
              padding: 3px;
              width: 100%;
              height: 100%;

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
        > div {
          display: inline-block;
          vertical-align: top;
          padding: 0;
          border: none;
          height: calc(var(--font-size-default) * var(--line-height-strip-unit));
          width: auto;
        }
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          > div {
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
      }

      &[sd-theme=white] {
        > div {
          > ._indicator_rect {
            background: white;
            border-color: var(--text-trans-lightest);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--text-trans-default);
            }
          }
        }
      }

      &[sd-checked=true] {
        > div > ._indicator_rect {
          background: var(--theme-primary-default);

          > ._indicator {
            opacity: 1;
          }
        }
      }

      &[sd-disabled=true] {
        > div {
          > ._indicator_rect {
            background: var(--theme-grey-lighter);
            border: 1px solid var(--trans-light);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--theme-grey-default);
            }
          }
        }
      }
    }
  `],
  host: {
    "[attr.sd-checked]": "value",
    "[attr.sd-disabled]": "disabled",
    "[attr.sd-inline]": "inline",
    "[attr.sd-inset]": "inset",
    "[attr.sd-radio]": "radio",
    "[attr.sd-size]": "size",
    "[attr.sd-theme]": "theme"
  }
})
export class SdCheckboxControl {
  #sdNgOpt = inject(SdAngularOptionsProvider);

  @Input({transform: coercionBoolean}) value = false;
  @Output() valueChange = new EventEmitter<boolean>();

  @Input({transform: coercionBoolean}) disabled = false;
  @Input({transform: coercionBoolean}) inline = false;
  @Input({transform: coercionBoolean}) inset = false;
  @Input({transform: coercionBoolean}) radio = false;
  @Input() size?: "sm" | "lg";
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" | "white";
  @Input() icon: IconProp = this.#sdNgOpt.icons.check;
  @Input() labelStyle?: string;

  onClick(): void {
    if (this.disabled) return;

    this.#setValue(!this.value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (event.key === " ") {
      this.#setValue(!this.value);
    }
  }

  #setValue(value: boolean) {
    if (this.value !== value) {
      if (this.valueChange.observed) {
        this.valueChange.emit(value);
      }
      else {
        this.value = value;
      }
    }
  }
}
