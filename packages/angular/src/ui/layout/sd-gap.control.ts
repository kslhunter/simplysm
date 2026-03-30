import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../scss/commons/variables";

      sd-gap {
        @each $key, $val in map.get(variables.$vars, gap) {
          &[data-sd-height="#{$key}"] {
            height: var(--gap-#{$key});
          }

          &[data-sd-width="#{$key}"] {
            width: var(--gap-#{$key});
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
  },
})
export class SdGapControl {
  private readonly _elRef = inject(ElementRef<HTMLElement>);

  height = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  heightPx = input<number>();
  width = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();
  widthPx = input<number>();
  widthEm = input<number>();

  constructor() {
    effect(() => {
      if (this.widthPx() === 0 || this.heightPx() === 0 || this.widthEm() === 0) {
        this._elRef.nativeElement.style.display = "none";
      } else if (
        this.width() !== undefined ||
        this.widthPx() !== undefined ||
        this.widthEm() !== undefined
      ) {
        this._elRef.nativeElement.style.display = "inline-block";
      } else if (this.height() !== undefined || this.heightPx() !== undefined) {
        this._elRef.nativeElement.style.display = "block";
      } else {
        this._elRef.nativeElement.style.display = "";
      }
    });
  }
}
