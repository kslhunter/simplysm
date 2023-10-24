import {ChangeDetectionStrategy, Component, DoCheck, HostBinding, inject, Injector, Input} from "@angular/core";
import {CommonModule} from "@angular/common";
import {coercionNumber} from "../utils/commons";
import {SdNgHelper} from "../utils/SdNgHelper";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
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
  `]
})
export class SdGapControl implements DoCheck {
  @Input()
  @HostBinding("attr.sd-height")
  height?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";

  @Input({transform: coercionNumber})
  @HostBinding("style.height.px")
  heightPx?: number;

  @Input()
  @HostBinding("attr.sd-width")
  width?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";

  @Input({transform: coercionNumber})
  @HostBinding("style.width.px")
  widthPx?: number;

  @Input({transform: coercionNumber})
  @HostBinding("style.width.em")
  widthEm?: number;

  @HostBinding("style.display")
  display: "block" | "inline-block" | "none" | undefined;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck() {
    this.#sdNgHelper.doCheck(run => {
      run({
        height: [this.height],
        heightPx: [this.heightPx],
        width: [this.width],
        widthPx: [this.widthPx],
        widthEm: [this.widthEm]
      }, () => {
        if (this.widthPx === 0 || this.heightPx === 0 || this.widthEm === 0) {
          this.display = "none";
        }
        else if (this.width !== undefined || this.widthPx !== undefined || this.widthEm !== undefined) {
          this.display = "inline-block";
        }
        else if (this.height !== undefined || this.heightPx !== undefined) {
          this.display = "block";
        }
        else {
          this.display = undefined;
        }
      });
    });
  }
}
