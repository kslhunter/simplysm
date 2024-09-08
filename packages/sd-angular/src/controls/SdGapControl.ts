import { ChangeDetectionStrategy, Component, ElementRef, inject, Input, ViewEncapsulation } from "@angular/core";
import { coercionNumber } from "../utils/commons";
import { sdCheck } from "../utils/hooks";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: "",
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
  host: {
    "[attr.sd-height]": "height",
    "[style.height.px]": "heightPx",
    "[attr.sd-width]": "width",
    "[style.width.px]": "widthPx",
    "[style.width.em]": "widthEm",
  },
})
export class SdGapControl {
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() height?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";
  @Input({ transform: coercionNumber }) heightPx?: number;
  @Input() width?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";
  @Input({ transform: coercionNumber }) widthPx?: number;
  @Input({ transform: coercionNumber }) widthEm?: number;

  constructor() {
    sdCheck.outside(
      this,
      [() => [this.height], () => [this.heightPx], () => [this.width], () => [this.widthPx], () => [this.widthEm]],
      () => {
        if (this.widthPx === 0 || this.heightPx === 0 || this.widthEm === 0) {
          this.#elRef.nativeElement.style.display = "none";
        } else if (this.width !== undefined || this.widthPx !== undefined || this.widthEm !== undefined) {
          this.#elRef.nativeElement.style.display = "inline-block";
        } else if (this.height !== undefined || this.heightPx !== undefined) {
          this.#elRef.nativeElement.style.display = "block";
        } else {
          this.#elRef.nativeElement.style.display = "";
        }
      },
    );
  }
}
