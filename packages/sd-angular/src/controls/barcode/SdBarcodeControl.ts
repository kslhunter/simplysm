import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
  ViewEncapsulation
} from "@angular/core";
import jsbarcode from "jsbarcode";
import {coercionNonNullableNumber} from "../../utils/commons";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <svg #svgEl></svg>`
})
export class SdBarcodeControl {
  value = input.required<string>();
  type = input<
    "CODE39" | "CODE128" | "CODE128A" | "CODE128B" | "CODE128C" |
    "EAN13" | "EAN8" | "EAN5" | "EAN2" |
    "UPC" |
    "ITF14" | "ITF" |
    "MSI" | "MSI10" | "MSI11" | "MSI1010" | "MSI1110" |
    "pharmacode" | "codabar"
  >("CODE128");
  lineWidth = input(1, {transform: coercionNonNullableNumber});
  height = input(58, {transform: coercionNonNullableNumber});

  svgElRef = viewChild.required<any, ElementRef<SVGElement>>("svgEl", {read: ElementRef});

  constructor() {
    effect(() => {
      jsbarcode(
        this.svgElRef().nativeElement,
        this.value(),
        {
          margin: 5,
          format: this.type(),
          width: this.lineWidth(),
          height: this.height(),
          displayValue: false
        }
      );
    });
  }
}
