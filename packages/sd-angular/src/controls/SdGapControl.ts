import {ChangeDetectionStrategy, Component, DoCheck, ElementRef, inject, Injector, Input} from "@angular/core";
import {coercionNumber} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: "",
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      @each $key, $val in map-get($vars, gap) {
        &[sd-height='#{$key}'] {
          height: var(--gap-#{$key});
        }

        &[sd-width='#{$key}'] {
          width: var(--gap-#{$key});
        }
      }
    }
  `],
  host: {
    "[attr.sd-height]": "height",
    "[style.height.px]": "heightPx",
    "[attr.sd-width]": "width",
    "[style.width.px]": "widthPx",
    "[style.width.em]": "widthEm"
  }
})
export class SdGapControl implements DoCheck {
  @Input() height?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";
  @Input({transform: coercionNumber}) heightPx?: number;
  @Input() width?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";
  @Input({transform: coercionNumber}) widthPx?: number;
  @Input({transform: coercionNumber}) widthEm?: number;

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheckOutside(run => {
      run({
        height: [this.height],
        heightPx: [this.heightPx],
        width: [this.width],
        widthPx: [this.widthPx],
        widthEm: [this.widthEm]
      }, () => {
        if (this.widthPx === 0 || this.heightPx === 0 || this.widthEm === 0) {
          this.#elRef.nativeElement.style.display = "none";
        }
        else if (this.width !== undefined || this.widthPx !== undefined || this.widthEm !== undefined) {
          this.#elRef.nativeElement.style.display = "inline-block";
        }
        else if (this.height !== undefined || this.heightPx !== undefined) {
          this.#elRef.nativeElement.style.display = "block";
        }
        else {
          this.#elRef.nativeElement.style.display = "";
        }
      });
    });
  }
}
