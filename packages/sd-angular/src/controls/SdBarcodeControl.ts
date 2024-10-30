import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild, ViewEncapsulation } from "@angular/core";
import jsbarcode from "jsbarcode";
import { $effect } from "../utils/$hooks";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <svg #svgEl></svg> `,
})
export class SdBarcodeControl {
  value = input<string>();
  type = input("code128");
  lineWidth = input(1);
  height = input(58);

  svgElRef = viewChild.required<any, ElementRef<SVGElement>>("svgEl", { read: ElementRef });

  constructor() {
    $effect(() => {
      jsbarcode(this.svgElRef().nativeElement, this.value() ?? "", {
        marginTop: -5,
        marginBottom: -5,
        format: this.type(),
        width: this.lineWidth(),
        height: this.height(),
        displayValue: false,
      });
    });
  }
}
