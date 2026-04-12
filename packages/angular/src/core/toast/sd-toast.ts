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
    "[attr.data-sd-open]": "open() || undefined",
    "[attr.data-sd-theme]": "theme()",
    "[attr.role]": "ariaRole()",
    "[attr.aria-live]": "ariaLive()",
  },
  template: `
    @if (message() !== undefined) {
      <div class="_message">{{ message() }}</div>
    }
    <ng-content />
    @if (useProgress()) {
      <div class="_progress">
        <div class="_progress-bar" [style.width.%]="progress()"></div>
      </div>
    }
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";
      @use "sass:map";

      sd-toast {
        display: block;
        position: relative;
        max-width: 32.5rem;
        width: 100%;
        margin: var(--gap-sm);
        padding: var(--gap-default) var(--gap-lg);
        border-radius: var(--border-radius-default);
        color: var(--text-trans-rev-default);
        pointer-events: auto;
        transform: translateY(-100%);
        opacity: 0;
        transition:
          transform var(--animation-duration) ease,
          opacity var(--animation-duration) ease;

        @include mixins.elevation(12);

        &[data-sd-open] {
          transform: translateY(0);
          opacity: 1;
        }

        @each $theme-name, $theme-map in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$theme-name}"] {
            background: map.get($theme-map, default);
          }
        }

        > ._message {
          word-break: break-all;
          white-space: pre-wrap;
        }

        > ._progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0.25rem;
          background: var(--trans-lighter);
          border-radius: 0 0 var(--border-radius-default) var(--border-radius-default);
          overflow: hidden;

          > ._progress-bar {
            height: 100%;
            background: var(--trans-default);
            transition: width 0.3s ease;
          }
        }

        @media all and (max-width: variables.$breakpoint-mobile) {
          max-width: none;
          margin: var(--gap-xs);
          border-radius: 0;
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
