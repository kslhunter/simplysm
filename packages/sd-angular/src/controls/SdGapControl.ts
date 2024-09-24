import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $effect } from "../utils/$hooks";
import { injectElRef } from "../utils/injectElRef";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

      sd-gap {
        @each $key, $val in map-get($vars, gap) {
          &[sd-height="#{$key}"] {
            height: var(--gap-#{$key});
          }

          &[sd-width="#{$key}"] {
            width: var(--gap-#{$key});
          }
        }
      }
    `,
  ],
  template: "",
  host: {
    "[attr.sd-height]": "height()",
    "[style.height.px]": "heightPx()",
    "[attr.sd-width]": "width()",
    "[style.width.px]": "widthPx()",
    "[style.width.em]": "widthEm()",
  },
})
export class SdGapControl {
  #elRef = injectElRef<HTMLElement>();

  height = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  heightPx = input<number>();
  width = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  widthPx = input<number>();
  widthEm = input<number>();

  constructor() {
    $effect(() => {
      if (this.widthPx() === 0 || this.heightPx() === 0 || this.widthEm() === 0) {
        this.#elRef.nativeElement.style.display = "none";
      } else if (this.width() !== undefined || this.widthPx() !== undefined || this.widthEm() !== undefined) {
        this.#elRef.nativeElement.style.display = "inline-block";
      } else if (this.height() !== undefined || this.heightPx() !== undefined) {
        this.#elRef.nativeElement.style.display = "block";
      } else {
        this.#elRef.nativeElement.style.display = "";
      }
    });
  }
}
