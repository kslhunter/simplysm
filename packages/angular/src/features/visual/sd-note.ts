import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";

      sd-note {
        display: block;
        padding: var(--sd-gap-sm) var(--sd-gap-default);
        background-color: var(--sd-bg-gray-subtle);

        border: none;
        border-radius: var(--sd-radius-default);

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            background-color: var(--sd-bg-#{$key}-subtle);
            // 보더는 배경과 동일 톤(라이트에선 비가시, 테마의 subtle 값을 그대로 추종)
            border: 1px solid var(--sd-bg-#{$key}-subtle);
          }
        }

        &[data-sd-size="sm"] {
          font-size: var(--sd-font-size-sm);
          padding: var(--sd-gap-xs) var(--sd-gap-sm);
        }

        &[data-sd-size="lg"] {
          padding: var(--sd-gap-default) var(--sd-gap-lg);
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
        }
      }
    `,
  ],
})
export class SdNote {
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
