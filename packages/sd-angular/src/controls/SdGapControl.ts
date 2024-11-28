import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $effect } from "../utils/$hooks";
import { injectElementRef } from "../utils/injectElementRef";

/**
 * 간격 컨트롤
 * 
 * 요소들 사이의 간격을 제어하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 세로 간격 -->
 * <div>첫 번째 요소</div>
 * <sd-gap height="sm"></sd-gap>
 * <div>두 번째 요소</div>
 * 
 * <!-- 가로 간격 -->
 * <span>첫 번째 요소</span>
 * <sd-gap width="sm"></sd-gap>
 * <span>두 번째 요소</span>
 * ```
 */
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
  #elRef = injectElementRef<HTMLElement>();

  height = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  heightPx = input<number>();
  width = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  widthPx = input<number>();
  widthEm = input<number>();

  constructor() {
    $effect(() => {
      if (this.widthPx() === 0 || this.heightPx() === 0 || this.widthEm() === 0) {
        this.#elRef.nativeElement.style.display = "none";
      }
      else if (this.width() !== undefined || this.widthPx() !== undefined || this.widthEm() !== undefined) {
        this.#elRef.nativeElement.style.display = "inline-block";
      }
      else if (this.height() !== undefined || this.heightPx() !== undefined) {
        this.#elRef.nativeElement.style.display = "block";
      }
      else {
        this.#elRef.nativeElement.style.display = "";
      }
    });
  }
}
