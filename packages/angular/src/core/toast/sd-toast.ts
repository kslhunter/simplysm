import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import type { SdToastTheme } from "./sd-toast.provider";

const POLITE_THEMES: ReadonlySet<string> = new Set(["info", "success"]);
const ASSERTIVE_THEMES: ReadonlySet<string> = new Set(["warning", "danger"]);

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  host: {
    "[attr.data-sd-open]": "open()",
    "[attr.data-sd-theme]": "theme()",
    "[attr.role]": "ariaRole()",
    "[attr.aria-live]": "ariaLive()",
  },
  template: `
    <div class="_sd-toast-block">
      <div class="_sd-toast-message">
        @if (message() != undefined) {
          {{ message() }}
        } @else {
          <ng-content />
        }
      </div>
      @if (useProgress()) {
        <div class="_sd-toast-progress">
          <div class="_sd-toast-progress-bar" [style.width.%]="progress()"></div>
        </div>
      }
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";
      @use "sass:map";

      sd-toast {
        display: block;
        margin-bottom: var(--gap-sm);
        text-align: center;
        width: 100%;
        pointer-events: none;

        > ._sd-toast-block {
          display: inline-block;
          text-align: left;
          color: var(--text-trans-rev-default);
          transform: translateY(-100%);
          border-radius: var(--border-radius-lg);
          opacity: 0;
          @include mixins.elevation(12);
          pointer-events: auto;

          > ._sd-toast-message {
            padding: var(--gap-default) var(--gap-lg);
            word-break: break-all;
            white-space: pre-wrap;
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

        @each $theme-name, $theme-map in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$theme-name}"] {
            > ._sd-toast-block {
              background: var(--theme-#{$theme-name}-default);

              > ._sd-toast-progress {
                background: var(--theme-#{$theme-name}-darker);

                > ._sd-toast-progress-bar {
                  background: var(--theme-#{$theme-name}-lighter);
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

        @media all and (max-width: variables.$breakpoint-mobile) {
          > ._sd-toast-block {
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
})
export class SdToast {
  open = model(false);
  useProgress = input(false, { transform: booleanAttribute });
  theme = input<SdToastTheme>("info");
  progress = model(0);
  message = model<string | undefined>(undefined);

  ariaRole = computed(() => {
    const t = this.theme();
    if (POLITE_THEMES.has(t)) return "status";
    if (ASSERTIVE_THEMES.has(t)) return "alert";
    return undefined;
  });

  ariaLive = computed(() => {
    const t = this.theme();
    if (POLITE_THEMES.has(t)) return "polite";
    if (ASSERTIVE_THEMES.has(t)) return "assertive";
    return undefined;
  });
}
