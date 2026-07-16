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
    "[style.background-color]": "color()",
    "[attr.data-sd-clickable]": "clickable()",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";

      sd-label {
        display: inline-block;
        background-color: var(--sd-bg-gray-solid);
        color: var(--sd-tx-gray-solid);
        padding: 0 var(--sd-gap-sm);
        border-radius: var(--sd-radius-default);
        text-indent: 0;

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            background-color: var(--sd-bg-#{$key}-solid);
            color: var(--sd-tx-#{$key}-solid);
          }
        }

        &[data-sd-clickable="true"] {
          cursor: pointer;

          &:hover {
            background-color: var(--sd-bg-gray-solid-hover);

            @each $key in variables.$theme-keys {
              &[data-sd-theme="#{$key}"] {
                background-color: var(--sd-bg-#{$key}-solid-hover);
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
