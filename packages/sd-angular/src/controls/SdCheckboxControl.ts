import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";

import { SdAngularOptionsProvider } from "../providers/SdAngularOptionsProvider";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [FaIconComponent],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";
      @import "../scss/mixins";

      sd-checkbox {
        @include form-control-base();
        color: inherit;
        cursor: pointer;

        height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2 + 2px);
        gap: var(--gap-sm);

        > ._indicator_rect {
          display: inline-block;
          vertical-align: calc((1em - var(--line-height)) / 2);
          user-select: none;

          width: calc(var(--font-size-default) + 2px);
          height: calc(var(--font-size-default) + 2px);
          border: 1px solid var(--trans-light);
          background: var(--theme-secondary-lightest);
          border-radius: var(--border-radius-xs);

          > ._indicator {
            text-align: center;
            opacity: 0;
            color: white;

            > fa-icon > svg {
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

        &[sd-checked="true"] {
          > ._indicator_rect {
            background: var(--theme-primary-default);

            > ._indicator {
              opacity: 1;
            }
          }
        }

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
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

            &[sd-checked="true"] {
              > ._indicator_rect {
                background: var(--theme-#{$key}-default);
              }
            }
          }
        }

        &[sd-theme="white"] {
          > ._indicator_rect {
            background: white;
            border-color: var(--text-trans-lightest);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--text-trans-default);
            }
          }

          &[sd-checked="true"] {
            > ._indicator_rect {
              background: var(--theme-primary-default);
            }
          }
        }

        &[sd-radio="true"] {
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

          &[sd-checked="true"] {
            > ._indicator_rect {
              background: var(--theme-primary-default);
            }
          }
        }

        &[sd-size="sm"] {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2 + 2px);
          padding: var(--gap-xs) var(--gap-sm);
          gap: var(--gap-xs);
        }

        &[sd-size="lg"] {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2 + 2px);
          padding: var(--gap-default) var(--gap-lg);
          gap: var(--gap-default);
        }

        &[sd-inset="true"] {
          height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2);
          border: none;
          justify-content: center;

          &[sd-size="sm"] {
            height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2);
          }

          &[sd-size="lg"] {
            height: calc(var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2);
          }
        }

        &[sd-inline="true"] {
          display: inline-block;
          vertical-align: top;
          padding: 0;
          border: none;
          height: calc(var(--font-size-default) * var(--line-height-strip-unit));
          width: auto;
        }

        &[sd-disabled="true"] {
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
    `,
  ],
  template: `
    <div class="_indicator_rect">
      <div class="_indicator">
        @if (!radio()) {
          <fa-icon [icon]="icon()" />
        } @else {
          <div></div>
        }
      </div>
    </div>
    <div class="_contents" [style]="contentStyle()">
      <ng-content />
    </div>
  `,
  host: {
    "[attr.sd-checked]": "value()",
    "[attr.sd-disabled]": "disabled()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-inset]": "inset()",
    "[attr.sd-radio]": "radio()",
    "[attr.sd-size]": "size()",
    "[attr.sd-theme]": "theme()",
    "[attr.tabindex]": "0",
  },
})
export class SdCheckboxControl {
  icons = inject(SdAngularOptionsProvider).icons;

  value = model(false);

  icon = input(this.icons.check);
  radio = input(false);
  disabled = input(false);

  size = input<"sm" | "lg">();
  inline = input(false);
  inset = input(false);
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" | "white">();

  contentStyle = input<string>();

  @HostListener("click")
  onClick() {
    if (this.disabled()) return;
    this.value.update((v) => !v);
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      if (this.disabled()) return;
      this.value.update((v) => !v);
    }
  }
}
