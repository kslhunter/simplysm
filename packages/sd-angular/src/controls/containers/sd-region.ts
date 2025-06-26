import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-region",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../scss/variables";

      sd-region {
        display: block;
        height: 100%;
        padding: var(--gap-xs);

        > div {
          display: flex;
          height: 100%;
          flex-direction: column;
          background: var(--control-color);
          border-radius: var(--border-radius-lg);

          animation: sd-region var(--animation-duration) ease-out;
          animation-fill-mode: forwards;
          opacity: 0;
          transform: translateY(-1em);

          > ._header {
            border-radius: var(--border-radius-lg);
            padding: var(--gap-default);
            font-size: var(--font-size-sm);
            color: var(--text-trans-lighter);
            font-weight: bold;
          }

          > ._content {
            flex-grow: 1;
            overflow: auto;
            background: var(--control-color);
            border-radius: var(--border-radius-lg);
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] {
            > div {
              background: var(--theme-#{$key}-lighter);
            }
          }
        }
      }

      @keyframes sd-region {
        from {
          opacity: 0;
          transform: translateY(-1em);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
    `,
  ],
  template: `
    <div [style]="cardStyle()">
      @if (header()) {
        <div class="_header">
          {{ header() }}
        </div>
      }
      <div class="_content" [class]="contentClass()" [style]="contentStyle()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  host: {
    "[attr.sd-theme]": "theme()",
  },
})
export class SdRegionControl {
  header = input<string>();

  cardStyle = input<string>();

  contentClass = input<string>();
  contentStyle = input<string>();

  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
}
