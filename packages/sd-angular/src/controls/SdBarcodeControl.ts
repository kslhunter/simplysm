import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, ViewEncapsulation } from "@angular/core";
import jsbarcode from "jsbarcode";
import { coercionNumber } from "../utils/commons";
import { sdCheck } from "../utils/hooks";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <svg #svgEl></svg>
  `,
})
export class SdBarcodeControl {
  @Input() value?: string;
  @Input() type = "code128";
  @Input({ transform: coercionNumber }) lineWidth = 1;
  @Input({ transform: coercionNumber }) height = 58;

  @ViewChild("svgEl", { static: true }) svgElRef!: ElementRef<SVGElement>;

  constructor() {
    sdCheck.outside(this,
      () => ({
        value: [this.value],
        type: [this.type],
        lineWidth: [this.lineWidth],
        height: [this.height],
      }),
      () => {
        jsbarcode(this.svgElRef.nativeElement, this.value ?? "", {
          margin: -5,
          format: this.type,
          width: this.lineWidth,
          height: this.height,
          displayValue: false,
        });
      },
    );
  }
}
