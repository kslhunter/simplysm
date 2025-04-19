import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import bwipjs from "bwip-js";
import { $effect } from "../utils/hooks";
import { injectElementRef } from "../utils/dom/element-ref.injector";

@Component({
  selector: "sd-barcode2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ``,
})
export class SdBarcode2Control {
  #elRef = injectElementRef<HTMLElement>();

  type = input.required<"code128" | "datamatrix" | "qrcode">();
  value = input<string>();
  scale = input<number>();

  constructor() {
    $effect(() => {
      this.#elRef.nativeElement.innerHTML = bwipjs.toSVG({
        bcid: this.type(),
        text: this.value() ?? "",
        scale: this.scale(),
      });
    });
  }
}
