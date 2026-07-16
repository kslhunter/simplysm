import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../scss/commons/variables";

      sd-gap {
        @each $key, $val in map.get(variables.$sd, gap) {
          &[data-sd-height="#{$key}"] {
            height: var(--sd-gap-#{$key});
          }

          &[data-sd-width="#{$key}"] {
            width: var(--sd-gap-#{$key});
          }
        }
      }
    `,
  ],
  template: "",
  host: {
    "[attr.data-sd-height]": "height()",
    "[style.height.px]": "heightPx()",
    "[attr.data-sd-width]": "width()",
    "[style.width.px]": "widthPx()",
    "[style.width.em]": "widthEm()",
    "[style.display]": "_displayStyle()",
  },
})
export class SdGap {
  height = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  heightPx = input<number>();
  width = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  widthPx = input<number>();
  widthEm = input<number>();

  _displayStyle = computed(() => {
    if (this.widthPx() === 0 || this.heightPx() === 0 || this.widthEm() === 0) {
      return "none";
    } else if (this.width() != null || this.widthPx() != null || this.widthEm() != null) {
      return "inline-block";
    } else if (this.height() != null || this.heightPx() != null) {
      return "block";
    } else {
      return undefined;
    }
  });
}
