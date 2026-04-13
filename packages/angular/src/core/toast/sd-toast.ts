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
    <div class="_block">
      @if (message() !== undefined) {
        <div class="_message">{{ message() }}</div>
      }
      <ng-content />
      @if (useProgress()) {
        <div class="_progress">
          <div class="_progress-bar" [style.width.%]="progress()"></div>
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

        > ._block {
          display: inline-block;
          text-align: left;
          color: var(--text-trans-rev-default);
          transform: translateY(-100%);
          border-radius: var(--border-radius-lg);
          opacity: 0;
          @include mixins.elevation(12);
          pointer-events: auto;

          > ._message {
            padding: var(--gap-default) var(--gap-lg);
            word-break: break-all;
            white-space: pre-wrap;
          }

          > ._progress {
            background: var(--theme-gray-default);
            height: 4px;
            border-radius: var(--border-radius-xl);
            margin: 0 4px 4px 4px;

            > ._progress-bar {
              border-radius: var(--border-radius-xl);
              height: 4px;
              transition: width 1s ease-out;
            }
          }
        }

        @each $theme-name, $theme-map in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$theme-name}"] {
            > ._block {
              background: map.get($theme-map, default);

              > ._progress {
                background: map.get($theme-map, darker);

                > ._progress-bar {
                  background: map.get($theme-map, lighter);
                }
              }
            }
          }
        }

        &[data-sd-open="true"] {
          > ._block {
            transform: none;
            transition: var(--animation-duration) ease-out;
            transition-property: transform, opacity;
            opacity: 1;
          }
        }

        &[data-sd-open="false"] {
          > ._block {
            transform: translateY(-100%);
            transition: var(--animation-duration) ease-in;
            transition-property: transform, opacity;
            opacity: 0;
          }
        }

        @media all and (max-width: variables.$breakpoint-mobile) {
          > ._block {
            border-radius: calc(var(--line-height) / 2);
            transform: translateY(100%);

            > ._message {
              padding: var(--gap-xs) var(--gap-default);
            }
          }

          &[data-sd-open="false"] {
            > ._block {
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
