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
      <div class="_indicator_rect"></div>
      <div class="_content">
        <ng-content/>
      </div>

      <div class="_indicator">
        <sd-icon [icon]="icon" fixedWidth/>        
      </div>
      <!--@if (!radio) {
        <sd-icon class="_indicator" [icon]="icon" fixedWidth/>
      } @else {
        <div class="_indicator">
          <div></div>
        </div>
      }-->
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    $sizeGaps: (
      default: (
        v: var(--gap-sm),
        h: var(--gap-default)
      ),
      sm: (
        v: var(--gap-xs),
        h: var(--gap-sm)
      ),
      lg: (
        v: var(--gap-default),
        h: var(--gap-lg)
      )
    );

    :host {
      > div {
        @include form-control-base();
        color: inherit;
        cursor: pointer;
        position: relative;

        display: flex;
        flex-wrap: nowrap;
        flex-direction: row;
        align-items: end;
        gap: var(--gap-sm);
        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2 + 2px);

        > ._indicator_rect {
          display: inline-block;
          width: calc(var(--font-size-default) + 2px);
          height: calc(var(--font-size-default) + 2px);
          border: 1px solid var(--trans-light);
          background: var(--theme-secondary-lightest);
          border-radius: var(--border-radius-sm);
          margin-bottom: var(--gap-xxs);
        }

        > ._indicator {
          display: inline-block;
          position: absolute;
          left: var(--gap-default);
          bottom: calc(var(--gap-sm) + var(--gap-xxs) + 1px);
          text-align: center;
          line-height: 1em;
        }

        > ._content {
          display: inline-block;
        }

        &:focus > ._indicator_rect {
          border-color: var(--theme-primary-default);
        }
      }

      &[sd-disabled=true] {
        > div {
          > ._indicator_rect {
            background: var(--theme-grey-lighter) !important;
          }
        }
      }

      &[sd-size=sm] > div {
        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2 + 2px);
        padding: var(--gap-xs) var(--gap-sm);
        gap: var(--gap-xs);

        > ._indicator {
          left: var(--gap-sm);
          bottom: calc(var(--gap-xs) + var(--gap-xxs) + 1px);
        }
      }

      &[sd-size=lg] > div {
        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2 + 2px);
        padding: var(--gap-default) var(--gap-lg);
        gap: var(--gap-default);

        > ._indicator {
          left: var(--gap-lg);
          bottom: calc(var(--gap-default) + var(--gap-xxs) + 1px);
        }
      }

      &[sd-inset=true] {
        > div {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2);
          border: none;

          > ._indicator {
            left: calc(var(--gap-default) - 1px);
            bottom: calc(var(--gap-sm) + var(--gap-xxs) + 1px);
          }
        }

        &[sd-size=sm] > div {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2);

          > ._indicator {
            left: calc(var(--gap-sm) - 1px);
            bottom: calc(var(--gap-xs) + var(--gap-xxs) + 1px);
          }
        }

        &[sd-size=lg] > div {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2);

          > ._indicator {
            left: calc(var(--gap-lg) - 1px);
            bottom: calc(var(--gap-default) + var(--gap-xxs) + 1px);
          }
        }
      }

      &[sd-inline=true] {
        display: inline-flex;

        > div {
          padding: 0;
          border: none;
          height: auto;

          > ._indicator {
            left: -1px;
            bottom: var(--gap-xxs);
          }
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


  /*$checkbox-size: calc(var(--font-size-default) * var(--line-height-strip-unit) - var(--gap-sm));

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
        //top: -1px;
        //text-indent: 1px;
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
        //padding: 0;
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
  }*/
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
