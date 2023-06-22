import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

import jsbarcode from "jsbarcode";
import qrcode from "qrcode";

@Component({
  selector: "sd-barcode",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas [hidden]="!value"
            [style.display]="type !== 'qrcode' ? 'none' : undefined"></canvas>
    <svg [hidden]="!value" [style.display]="type === 'qrcode' ? 'none' : undefined"
         [style.margin-bottom]="'-5px'"></svg>`
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

  public constructor(private readonly _elRef: ElementRef) {
  }

  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (Object.keys(changes).length > 0) {
      if (this.value !== undefined) {
        if (this.type === "qrcode") {
          const canvasEl = (this._elRef.nativeElement as HTMLElement).findFirst("> canvas") as HTMLCanvasElement;

          await qrcode.toCanvas(canvasEl, this.value ?? "", {
            scale: this.lineWidth
          });

          /*svgEl.outerHTML = await qrcode.toString(this.value ?? "", {
            type: "svg",
            scale: this.lineWidth
          });*/
        }
        else {
          const svgEl = (this._elRef.nativeElement as HTMLElement).findFirst("> svg") as HTMLCanvasElement;

          jsbarcode(
            svgEl,
            this.value,
            {
              margin: 0,
              format: this.type,
              width: this.lineWidth,
              height: this.height,
              displayValue: false
            }
          );
        }
      }
    }
  }
}
