import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div class="_sd-toast-block">
      <div class="_sd-toast-message">
        @if (message() != null) {
          {{ message() }}
        } @else {
          <ng-content></ng-content>
        }
      </div>
      @if (useProgress()) {
        <div class="_sd-toast-progress">
          <div class="_sd-toast-progress-bar" [style.width]="progress() + '%'"></div>
        </div>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../../scss/commons/mixins";
      @use "../../../../scss/commons/variables";

      sd-toast {
        display: block;
        margin-bottom: var(--gap-sm);
        text-align: center;
        width: 100%;
        pointer-events: none;

        > ._sd-toast-block {
          display: inline-block;
          text-align: left;
          color: white;
          transform: translateY(-100%);
          border-radius: var(--border-radius-lg);
          opacity: 0;
          @include mixins.elevation(12);
          pointer-events: auto;

          > ._sd-toast-message {
            padding: var(--gap-default) var(--gap-lg);
          }

          > ._sd-toast-progress {
            background: var(--theme-gray-default);
            height: 4px;
            border-radius: var(--border-radius-xl);
            margin: 0 4px 4px 4px;

            > ._sd-toast-progress-bar {
              border-radius: var(--border-radius-xl);
              height: 4px;
              transition: width 1s ease-out;
            }
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            > ._sd-toast-block {
              background: var(--theme-#{$key}-default);

              > ._sd-toast-progress {
                background: var(--theme-#{$key}-darker);

                > ._sd-toast-progress-bar {
                  background: var(--theme-#{$key}-lighter);
                }
              }
            }
          }
        }

        &[data-sd-open="true"] {
          > ._sd-toast-block {
            transform: none;
            transition: var(--animation-duration) ease-out;
            transition-property: transform, opacity;
            opacity: 1;
          }
        }

        &[data-sd-open="false"] {
          > ._sd-toast-block {
            transform: translateY(-100%);
            transition: var(--animation-duration) ease-in;
            transition-property: transform, opacity;
            opacity: 0;
          }
        }

        @media all and (max-width: 520px) {
          > ._sd-toast-block {
            //@include mixins.elevation(0);
            border-radius: calc(var(--line-height) / 2);

            transform: translateY(100%);

            > ._sd-toast-message {
              padding: var(--gap-xs) var(--gap-default);
            }
          }

          &[data-sd-open="false"] {
            > ._sd-toast-block {
              transform: translateY(100%);
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-open]": "open()",
    "[attr.data-sd-theme]": "theme()",
  },
})
export class SdToastControl {
  open = input(false, { transform: transformBoolean });
  useProgress = input(false, { transform: transformBoolean });
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >("info");

  progress = input<number>(0);
  message = input<string>();
}
