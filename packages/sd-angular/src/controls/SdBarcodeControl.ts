import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

import jsbarcode from "jsbarcode";
import qrcode from "qrcode";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg></svg>`
})
export class SdBarcodeControl implements OnChanges {
  @Input()
  @SdInputValidate(String)
  public value?: string;

  @Input()
  @SdInputValidate(String)
  public type = "code128";

  @Input()
  @SdInputValidate(Number)
  public lineWidth = 1;

  @Input()
  @SdInputValidate(Number)
  public height = 58;

  @Input()
  @SdInputValidate(Number)
  public margin = 10;

  @Input()
  @SdInputValidate(Number)
  public fontSize?: number;

  public constructor(private readonly _elRef: ElementRef) {
  }

  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    const el = this._elRef.nativeElement as HTMLElement;
    el.innerHTML = "";

    if (Object.keys(changes).length > 0) {
      if (this.value !== undefined) {
        if (this.type === "qrcode") {
          el.innerHTML = await qrcode.toString(this.value || "", {
            type: "svg",
            scale: this.lineWidth
          });
        }
        else {
          const svgEl = document.createElement("svg");

          jsbarcode(
            svgEl,
            this.value,
            {
              margin: this.margin,
              format: this.type,
              width: this.lineWidth,
              height: this.height,
              fontOptions: "bold",
              fontSize: this.fontSize !== undefined ? this.fontSize : (this.lineWidth * 12)
            }
          );

          el.innerHTML = svgEl.outerHTML;
        }
      }
    }
  }
}
