import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[style.background]": "color()",
    "[attr.data-sd-clickable]": "clickable()",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../scss/commons/variables";

      sd-label {
        display: inline-block;
        background: var(--theme-gray-darker);
        color: var(--text-trans-rev-default);
        padding: 0 var(--gap-sm);
        border-radius: var(--border-radius-default);
        text-indent: 0;

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
          }
        }

        &[data-sd-clickable="true"] {
          cursor: pointer;

          &:hover {
            background: var(--theme-gray-dark);

            @each $key, $val in map.get(variables.$vars, theme) {
              &[data-sd-theme="#{$key}"] {
                background: var(--theme-#{$key}-dark);
              }
            }
          }
        }
      }
    `,
  ],
})
export class SdLabel {
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();
  color = input<string>();
  clickable = input(false, { transform: booleanAttribute });
}
